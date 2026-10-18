(() => {
  // Show only the inputs that apply to the chosen content type.
  const contentTypeSelect = document.querySelector('[data-content-type-select]');
  if (contentTypeSelect) {
    const sync = () => {
      document.querySelectorAll('[data-show-for]').forEach((el) => {
        el.hidden = !el.dataset.showFor.split(' ').includes(contentTypeSelect.value);
      });
    };
    contentTypeSelect.addEventListener('change', sync);
    sync();
  }

  // Add and remove test case rows. Indexes only need to be unique; gaps are fine.
  const list = document.querySelector('[data-test-cases]');
  const template = document.getElementById('test-case-template');
  const addButton = document.querySelector('[data-add-test-case]');
  if (list && template && addButton) {
    let nextIndex = list.children.length;
    addButton.addEventListener('click', () => {
      list.insertAdjacentHTML('beforeend', template.innerHTML.replaceAll('__INDEX__', String(nextIndex++)));
    });
    list.addEventListener('click', (event) => {
      const removeButton = event.target.closest('[data-remove-test-case]');
      if (removeButton) removeButton.closest('.test-case').remove();
    });
  }

  // Lab steps: add, remove and reorder. Fields are named instructions[] so they submit in on-screen order.
  const steps = document.querySelector('[data-lab-steps]');
  const stepTemplate = document.getElementById('lab-step-template');
  const addStepButton = document.querySelector('[data-add-lab-step]');
  if (steps && stepTemplate && addStepButton) {
    const renumber = () => {
      const all = steps.querySelectorAll('.lab-step');
      all.forEach((step, index) => {
        step.querySelector('[data-step-label]').textContent = `Step ${index + 1}`;
        step.querySelector('[data-move-step="up"]').disabled = index === 0;
        step.querySelector('[data-move-step="down"]').disabled = index === all.length - 1;
      });
    };
    addStepButton.addEventListener('click', () => {
      steps.insertAdjacentHTML('beforeend', stepTemplate.innerHTML);
      renumber();
      steps.lastElementChild.querySelector('textarea').focus();
    });
    steps.addEventListener('click', (event) => {
      const step = event.target.closest('.lab-step');
      if (!step) return;
      if (event.target.closest('[data-remove-lab-step]')) {
        step.remove();
      } else if (event.target.closest('[data-move-step="up"]') && step.previousElementSibling) {
        step.previousElementSibling.before(step);
      } else if (event.target.closest('[data-move-step="down"]') && step.nextElementSibling) {
        step.nextElementSibling.after(step);
      } else {
        return;
      }
      renumber();
    });
    renumber();
  }
})();
