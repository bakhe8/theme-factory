function scentQuizText(product) {
  return String(product.dataset.scentQuizKey || '').toLowerCase();
}

function scentQuizMatches(product, value) {
  const normalized = String(value || 'all').trim().toLowerCase();
  if (!normalized || normalized === 'all') return true;
  return scentQuizText(product).includes(normalized);
}

function setScentQuizResult(quiz, button) {
  const value = button.dataset.scentMatch || 'all';
  let visible = 0;

  quiz.querySelectorAll('[data-scent-quiz-option]').forEach((option) => {
    option.setAttribute('aria-pressed', option === button ? 'true' : 'false');
  });

  quiz.querySelectorAll('[data-scent-quiz-product]').forEach((product) => {
    const matched = scentQuizMatches(product, value);
    product.hidden = !matched;
    if (matched) visible += 1;
  });

  const resultTitle = quiz.querySelector('[data-scent-quiz-result-title]');
  const resultNote = quiz.querySelector('[data-scent-quiz-result-note]');
  const result = quiz.querySelector('[data-scent-quiz-result]');
  const empty = quiz.querySelector('[data-scent-quiz-empty]');

  if (resultTitle) resultTitle.textContent = button.dataset.scentTitle || button.textContent.trim();
  if (resultNote) resultNote.textContent = button.dataset.scentNote || '';
  if (result) result.hidden = false;
  if (empty) empty.hidden = visible !== 0;
}

function resetScentQuiz(quiz) {
  const first = quiz.querySelector('[data-scent-quiz-option]');
  if (first) setScentQuizResult(quiz, first);
}

function initScentQuiz(root = document) {
  root.querySelectorAll('[data-scent-quiz]').forEach((quiz) => {
    if (quiz.dataset.scentQuizReady === 'true') return;
    quiz.dataset.scentQuizReady = 'true';

    quiz.querySelectorAll('[data-scent-quiz-option]').forEach((button) => {
      button.addEventListener('click', () => setScentQuizResult(quiz, button));
    });

    quiz.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') resetScentQuiz(quiz);
    });
  });
}

document.addEventListener('theme::ready', () => initScentQuiz());
if (document.readyState !== 'loading') initScentQuiz();
