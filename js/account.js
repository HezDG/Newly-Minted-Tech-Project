function readProfile() {
  try { return JSON.parse(localStorage.getItem('techmint-profile')) || {}; } catch { return {}; }
}
function writeProfile(data) {
  localStorage.setItem('techmint-profile', JSON.stringify(data));
}

function applyProfile(profile) {
  const img = document.getElementById('profilePreview');
  const welcome = document.getElementById('welcomeName');
  const username = document.getElementById('username');
  const password = document.getElementById('password');
  if (img) img.src = profile.avatar || '../assets/default-avatar.svg';
  if (welcome) welcome.textContent = profile.username ? `Welcome, ${profile.username}` : 'Welcome';
  if (username && profile.username) username.value = profile.username;
  if (password && profile.password) password.value = profile.password;
}

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('accountForm');
  if (!form) return;
  const avatarUpload = document.getElementById('avatarUpload');
  const resetBtn = document.getElementById('resetAccount');
  let profile = readProfile();
  applyProfile(profile);

  avatarUpload?.addEventListener('change', () => {
    const file = avatarUpload.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      profile.avatar = reader.result;
      applyProfile(profile);
    };
    reader.readAsDataURL(file);
  });

  form.addEventListener('submit', e => {
    e.preventDefault();
    profile.username = document.getElementById('username').value.trim();
    profile.password = document.getElementById('password').value;
    writeProfile(profile);
    applyProfile(profile);
    alert('Account saved locally.');
  });

  resetBtn?.addEventListener('click', () => {
    localStorage.removeItem('techmint-profile');
    profile = {};
    form.reset();
    applyProfile(profile);
  });
});
