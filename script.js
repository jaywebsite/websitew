// ===== HAMBURGER MENU =====
const hamburger = document.getElementById('hamburger');
const navLinks = document.querySelector('.nav-links');

hamburger.addEventListener('click', () => {
  navLinks.classList.toggle('open');
});

// Close menu on link click
document.querySelectorAll('.nav-links a').forEach(link => {
  link.addEventListener('click', () => {
    navLinks.classList.remove('open');
  });
});

// ===== ACTIVE NAV LINK ON SCROLL =====
const sections = document.querySelectorAll('section');
const links = document.querySelectorAll('.nav-links a');

window.addEventListener('scroll', () => {
  let current = '';
  sections.forEach(section => {
    const sectionTop = section.offsetTop - 80;
    if (window.scrollY >= sectionTop) {
      current = section.getAttribute('id');
    }
  });

  links.forEach(link => {
    link.classList.remove('active');
    if (link.getAttribute('href') === '#' + current) {
      link.classList.add('active');
    }
  });
});

// ===== SCROLL REVEAL ANIMATION =====
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll('.service-card, .portfolio-card, .about-text, .about-img').forEach(el => {
  el.classList.add('fade-in');
  observer.observe(el);
});

// ===== CONTACT FORM =====
const form = document.querySelector('.contact-form');
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = form.querySelector('.btn');
  const data = new FormData(form);

  btn.textContent = 'Sending…';
  btn.disabled = true;

  try {
    const res = await fetch(form.action, {
      method: 'POST',
      body: data,
      headers: { 'Accept': 'application/json' }
    });

    if (res.ok) {
      btn.textContent = 'Sent! ✓';
      btn.style.background = '#28a745';
      form.reset();
      setTimeout(() => {
        btn.textContent = 'Send Message';
        btn.style.background = '';
        btn.disabled = false;
      }, 4000);
    } else {
      btn.textContent = 'Failed. Try again.';
      btn.style.background = '#c0392b';
      btn.disabled = false;
    }
  } catch {
    btn.textContent = 'Error. Try again.';
    btn.style.background = '#c0392b';
    btn.disabled = false;
  }
});

// ===== TYPED TEXT EFFECT =====
const titleEl = document.querySelector('.title-text');
if (titleEl) {
  const texts = ['Jayden <span class="red">Website</span>', 'Content <span class="red">Creator</span>', 'Always <span class="red">Baliw</span> 😂'];
  let i = 0;
  setInterval(() => {
    i = (i + 1) % texts.length;
    titleEl.innerHTML = texts[i];
  }, 3000);
}

// ===== BACKGROUND MUSIC =====
let musicPlaying = false;
const bgMusic = document.getElementById('bg-music');

function overlayPlay() {
  const overlay = document.getElementById('music-overlay');
  const vinyl   = document.getElementById('overlay-vinyl');

  if (!bgMusic) return;
  bgMusic.volume = 1.0;
  bgMusic.play().then(() => {
    musicPlaying = true;
    if (vinyl) vinyl.style.animationPlayState = 'running';
    overlay.classList.add('hide');
    setTimeout(() => {
      overlay.style.display = 'none';
      // Push polaroids back behind content
      const pb = document.querySelector('.polaroid-bg');
      if (pb) pb.style.zIndex = '-1';
    }, 800);
    document.getElementById('music-btn').classList.add('playing');
    document.getElementById('music-label').textContent = '♪ wave to earth - love';
  }).catch(() => {});
}

function toggleMusic() {
  const btn   = document.getElementById('music-btn');
  const icon  = document.getElementById('music-icon');
  const label = document.getElementById('music-label');

  if (!bgMusic) return;

  if (musicPlaying) {
    bgMusic.pause();
    btn.classList.remove('playing');
    btn.classList.add('paused');
    icon.className = 'fas fa-pause';
    label.textContent = '♪ Paused';
    musicPlaying = false;
  } else {
    bgMusic.play();
    btn.classList.remove('paused');
    btn.classList.add('playing');
    icon.className = 'fas fa-music';
    label.textContent = '♪ wave to earth - love';
    musicPlaying = true;
  }
}
