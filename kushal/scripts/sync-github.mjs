import { spawnSync } from 'node:child_process';
import { access, copyFile, mkdir, readdir, readFile, realpath } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const source = fileURLToPath(new URL('../', import.meta.url));
const target = resolve(source, '..', 'kushal-port');
const portfolioTarget = join(target, 'kushal');
const remote = 'https://github.com/Mayaskara25/sklbs-port.git';
const branch = 'kushal-port';
const repo = 'Mayaskara25/sklbs-port';
const files = ['index.html', 'style.css', 'script.js', 'scene.js', 'projects.js', 'activity.js', 'package.json', 'package-lock.json', '.gitignore', 'README.md', 'TECHNIQUES.md'];
const thresholdArgument = process.argv.slice(2).find(argument => /^--min-lines=\d+$/.test(argument));
const minimumLines = thresholdArgument ? Number(thresholdArgument.split('=')[1]) : 0;
if (process.argv.slice(2).some(argument => argument !== thresholdArgument) || !Number.isSafeInteger(minimumLines)) {
  throw new Error('Usage: node scripts/sync-github.mjs [--min-lines=100]');
}

function command(program, args, cwd = target, allowed = [0]) {
  const result = spawnSync(program, args, { cwd, encoding: 'utf8', timeout: 180000, maxBuffer: 4 * 1024 * 1024 });
  if (!allowed.includes(result.status)) throw new Error(`${program} ${args[0]} failed: ${(result.stderr || result.stdout || result.error?.message || '').trim()}`);
  return { status: result.status, text: result.stdout.trim() };
}
const git = (args, allowed) => command('git', args, target, allowed);
const exists = async (path) => { try { await access(path); return true; } catch { return false; } };

async function collect(directory, prefix) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const relative = `${prefix}/${entry.name}`;
    if (entry.isDirectory()) await collect(join(directory, entry.name), relative);
    else if (entry.isFile()) files.push(relative);
    else throw new Error(`Refusing to copy a symlink or special file: ${relative}`);
  }
}

try {
  if (resolve(source) === target) throw new Error('The source and checkpoint checkout must be separate directories.');
  if (!await exists(target)) {
    command('git', ['clone', '--origin', 'github', remote, target], dirname(target));
    const remoteBranch = git(['show-ref', '--verify', '--quiet', `refs/remotes/github/${branch}`], [0, 1]).status === 0;
    git(['switch', '-c', branch, ...(remoteBranch ? ['--track', `github/${branch}`] : [])]);
  }
  if (await realpath(target) !== git(['rev-parse', '--show-toplevel']).text) throw new Error('Unexpected checkpoint checkout root.');
  if (git(['remote', 'get-url', 'github']).text !== remote) throw new Error('Unexpected GitHub remote.');
  if (git(['branch', '--show-current']).text !== branch) throw new Error(`The checkpoint checkout must be on ${branch}.`);
  if (git(['status', '--porcelain']).text) throw new Error('The checkpoint checkout has local edits. Review them before synchronizing.');
  git(['fetch', 'github']);
  if (git(['show-ref', '--verify', '--quiet', `refs/remotes/github/${branch}`], [0, 1]).status === 0) {
    const remoteIsAncestor = git(['merge-base', '--is-ancestor', `github/${branch}`, 'HEAD'], [0, 1]).status === 0;
    if (!remoteIsAncestor) git(['merge', '--ff-only', `github/${branch}`]);
  }
  await collect(join(source, 'public'), 'public');
  await collect(join(source, 'scripts'), 'scripts');
  const changed = [];
  let changedLines = 0;
  let binaryChanged = false;
  for (const path of files) {
    const hash = (buffer) => createHash('sha256').update(buffer).digest('hex');
    const original = await readFile(join(source, path));
    const copy = await exists(join(portfolioTarget, path)) ? await readFile(join(portfolioTarget, path)) : null;
    if (!copy || hash(original) !== hash(copy)) {
      changed.push(path);
      if (original.includes(0) || copy?.includes(0)) binaryChanged = true;
      else if (!copy) changedLines += original.toString('utf8').split('\n').length - (original.at(-1) === 10 ? 1 : 0);
      else {
        const diff = command('git', ['diff', '--no-index', '--numstat', '--', join(portfolioTarget, path), join(source, path)], source, [0, 1]).text;
        const [added, removed] = diff.split(/\s+/);
        if (/^\d+$/.test(added) && /^\d+$/.test(removed)) changedLines += Number(added) + Number(removed);
        else binaryChanged = true;
      }
    }
  }
  const checkpointDue = changed.length > 0 && (changedLines >= minimumLines || binaryChanged);
  console.log(`${changedLines} added/removed text lines since the last checkpoint; threshold ${minimumLines}${binaryChanged ? '; changed binary asset' : ''}.`);
  if (checkpointDue) {
    const build = command('npm', ['run', 'build'], source);
    console.log(build.text);
    for (const path of changed) {
      await mkdir(dirname(join(portfolioTarget, path)), { recursive: true });
      await copyFile(join(source, path), join(portfolioTarget, path));
    }
    git(['add', '--', ...changed]);
    git(['config', 'user.name', 'Kushal Gowda S']);
    git(['config', 'user.email', 'kushalgowda57365@gmail.com']);
    git(['commit', '-m', 'feat: update orange Three.js portfolio']);
    console.log(`Prepared ${changed.length} portfolio files in local branch ${branch}.`);
  } else if (changed.length) {
    console.log('Keeping changes in the source workspace until the line threshold is reached. Any previously committed checkpoint can still be pushed.');
  }
  const permission = command('gh', ['api', `repos/${repo}`, '--jq', '.permissions.push'], target);
  if (permission.text !== 'true') {
    console.error(`PUSH BLOCKED: the authenticated GitHub account has no Write access to ${repo}. The local ${branch} branch and commit are ready. Grant repository Write access before retrying; no remote branch was changed.`);
    process.exitCode = 2;
  } else {
    git(['-c', 'credential.helper=!gh auth git-credential', 'push', '--set-upstream', 'github', `HEAD:refs/heads/${branch}`]);
    console.log(`Pushed ${git(['rev-parse', 'HEAD']).text} to https://github.com/${repo}/tree/${branch}`);
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
