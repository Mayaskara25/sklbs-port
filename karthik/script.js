document.documentElement.classList.add('js');

var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
var pageProgress = document.getElementById('page-progress');
var menuButton = document.getElementById('menu-button');
var mobileNav = document.getElementById('mobile-nav');
var cursorLight = document.querySelector('.cursor-light');

function updateProgress() {
  var scrollable = document.documentElement.scrollHeight - window.innerHeight;
  var progress = scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0;
  if (pageProgress) pageProgress.style.width = Math.min(progress, 100) + '%';
}

window.addEventListener('scroll', updateProgress, { passive: true });
window.addEventListener('resize', updateProgress, { passive: true });
updateProgress();

function setMenu(open) {
  if (!menuButton || !mobileNav) return;
  menuButton.setAttribute('aria-expanded', String(open));
  menuButton.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  mobileNav.classList.toggle('is-open', open);
  document.body.classList.toggle('menu-open', open);
}

if (menuButton && mobileNav) {
  menuButton.addEventListener('click', function () {
    setMenu(menuButton.getAttribute('aria-expanded') !== 'true');
  });

  mobileNav.querySelectorAll('a').forEach(function (link) {
    link.addEventListener('click', function () { setMenu(false); });
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') setMenu(false);
  });
}

var revealItems = document.querySelectorAll('.reveal');
if (reducedMotion || !('IntersectionObserver' in window)) {
  revealItems.forEach(function (item) { item.classList.add('is-visible'); });
} else {
  var revealObserver = new IntersectionObserver(function (entries, observer) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px' });

  revealItems.forEach(function (item) { revealObserver.observe(item); });
}

if (cursorLight && window.matchMedia('(hover: hover) and (pointer: fine)').matches && !reducedMotion) {
  document.body.classList.add('has-pointer');
  window.addEventListener('pointermove', function (event) {
    cursorLight.style.left = event.clientX + 'px';
    cursorLight.style.top = event.clientY + 'px';
  }, { passive: true });
}

var contactForm = document.getElementById('contact-form');
var submitButton = document.getElementById('submit-button');
var formStatus = document.getElementById('form-status');

if (contactForm && submitButton && formStatus) {
  contactForm.addEventListener('submit', async function (event) {
    event.preventDefault();
    var originalLabel = submitButton.innerHTML;
    submitButton.disabled = true;
    submitButton.textContent = 'Sending…';
    formStatus.textContent = '';

    try {
      var response = await fetch(contactForm.action, {
        method: 'POST',
        body: new FormData(contactForm),
        headers: { Accept: 'application/json' }
      });

      if (!response.ok) throw new Error('Request failed');
      contactForm.reset();
      formStatus.textContent = 'Message sent. Thanks — I’ll get back to you soon.';
    } catch (error) {
      formStatus.textContent = 'Could not send right now. Please try again in a moment.';
    } finally {
      submitButton.disabled = false;
      submitButton.innerHTML = originalLabel;
    }
  });
}

var year = document.getElementById('year');
if (year) year.textContent = String(new Date().getFullYear());
