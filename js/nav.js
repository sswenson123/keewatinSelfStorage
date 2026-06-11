// Mobile nav toggle — shared across all pages
(function () {
  const ham = document.getElementById('hamburger');
  const nav = document.getElementById('navLinks');
  if (!ham || !nav) return;
  ham.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    ham.setAttribute('aria-expanded', open);
  });
  nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
    nav.classList.remove('open');
    ham.setAttribute('aria-expanded', false);
  }));

  // FAQ accordion — works on any page that has .faq-item elements
  document.querySelectorAll('.faq-q').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.closest('.faq-item');
      const isOpen = item.classList.contains('open');
      document.querySelectorAll('.faq-item.open').forEach(i => {
        i.classList.remove('open');
        i.querySelector('.faq-q').setAttribute('aria-expanded', false);
      });
      if (!isOpen) { item.classList.add('open'); btn.setAttribute('aria-expanded', true); }
    });
  });
}());
