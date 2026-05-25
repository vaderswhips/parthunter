document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('ph-q').addEventListener('keydown', e => {
    if (e.key === 'Enter') doSearch();
  });
  document.getElementById('sb-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') sbSend();
  });

  setTimeout(() => {
    sbAdd('<div class="bubble">Hey, I\'m your PartHunter build planner.<br><br>What car are we building on?</div>');
  }, 300);
});
