export const projects = {
  embeded: {
    name: 'EmbedEd', category: '01 / ML RESEARCH · SEP 2026 — PRESENT',
    description: 'Contrastive learning for Java code-clone detection. A study of how negative sampling influences what GraphCodeBERT learns.',
    details: ['Fine-tuning GraphCodeBERT with margin-triplet loss on BigCloneBench.', 'Working with random, BM25-mined, and embedding-mined examples to understand how training data shapes model behavior.', 'Writing hypotheses and decision gates before training, with configuration fingerprints across Colab environments.'],
    tags: ['Python', 'PyTorch', 'Hugging Face', 'GraphCodeBERT', 'Google Colab'],
    url: 'https://github.com/ksu-gitreaper807/EmbedEd/tree/arena/01a0e714-embeded'
  },
  cppsey: {
    name: 'CPPSEYv1', category: '02 / REAL-TIME SYSTEMS · FEB 2026 — PRESENT',
    description: 'A real-time photosensitive-epilepsy flash detection prototype, built around video capture, temporal analysis, and a dim or blackout response.',
    details: ['C++17 and AVX2 kernels, with separate threaded detectors for different temporal windows.', 'Screen capture across X11 and Wayland, using FFmpeg, PipeWire, and desktop portals.', 'Applying ITU-R BT.1702-3 flash criteria and using a graded risk score to drive a display response.'],
    tags: ['C++17', 'AVX2', 'FFmpeg', 'X11 / Wayland', 'PipeWire'],
    note: 'A research prototype, not a medical device or a safety guarantee.',
    url: 'https://github.com/ksu-gitreaper807/CPPSEYv1'
  },
  goalguard: {
    name: 'GoalGuard', category: '03 / ON-DEVICE AI · SEP 2026',
    description: 'A goal-aware screen-time limiter for Firefox. It classifies a tab against your weekly goal on your own device, then adds timed friction for off-goal pages.',
    details: ['Bundled BGE-small embeddings running through Transformers.js and ONNX Runtime Web.', 'A layered decision pipeline: deterministic rules, embeddings, optional web context, and an optional local judge.', 'Graceful fallbacks keep the previous layer’s decision when an optional layer is unavailable.'],
    tags: ['Firefox', 'WebExtensions MV3', 'Transformers.js', 'ONNX'],
    url: 'https://github.com/ksu-gitreaper807/Non-compete-agreement/tree/arena/01a0e131-non-compete-agreement'
  },
  whatselectron: {
    name: 'WhatsElectron-Linux', category: '04 / DESKTOP SOFTWARE · AUG 2026',
    description: 'An unofficial, sandboxed Electron client for WhatsApp Web, with native Linux integration and a considered permission model.',
    details: ['Desktop notifications grouped per chat, a StatusNotifier tray, and XDG-portal Do Not Disturb integration.', 'Autostart and a global shortcut for fitting the app into everyday desktop workflows.', 'Schema-validated IPC with sender authentication, URL and permission allow-lists, and a Content Security Policy.'],
    tags: ['Electron', 'Linux', 'GitHub Actions', 'Desktop integration'],
    url: 'https://github.com/ksu-gitreaper807/WhatsElectron-Linux'
  },
  dimsum: {
    name: 'dimsum', category: '05 / GRAPHICS + COMPOSITOR · SEP 2026',
    description: 'A compositor-wide dimmer for KDE Plasma 6. It brings the Wayland desktop below the hardware backlight minimum with a native KWin effect.',
    details: ['Renders the desktop offscreen and redraws it through a GLSL multiply shader.', 'A pass-through fallback keeps the normal display if the shader cannot be used.', 'Built with C++, Qt 6, KWin, and OpenGL, with global shortcuts through KGlobalAccel.'],
    tags: ['C++', 'Qt 6', 'KWin', 'OpenGL / GLSL', 'KDE Plasma'],
    url: 'https://github.com/ksu-gitreaper807/dimsum'
  }
};
