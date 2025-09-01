function saveCurrentData(expandedItem) {
    // Check if snapshot has already been taken
    if (expandedItem.dataset.snapshotTaken === 'true') return;

    // Take a snapshot of the current state
    const titleField = expandedItem.querySelector('input[id^="topic-input-title-"]');
    const descriptionField = expandedItem.querySelector('textarea[id^="topic-input-desc-"]');
    const filePreview = expandedItem.querySelector('.topic-file-exists');
    const snapshot = {
        title: titleField ? titleField.value : '',
        desc: descriptionField ? descriptionField.value : '',
        hadFile: !!filePreview,
        fileHTML: filePreview ? filePreview.outerHTML : ''
    };

    // Store the snapshot in the dataset
    expandedItem.dataset.originalState = JSON.stringify(snapshot);
    // Mark that a snapshot has been taken
    expandedItem.dataset.snapshotTaken = 'true';
}

function restoreData(expandedItem) {
    // Check if snapshot exists
    const rawSnapshot = expandedItem.dataset.originalState;
    if (!rawSnapshot) return;

    let snapshot;
    try {
        snapshot = JSON.parse(rawSnapshot);
    } catch {
        return;
    }

    // Restore the title and description fields
    const titleField = expandedItem.querySelector('input[id^="topic-input-title-"]');
    const descriptionField = expandedItem.querySelector('textarea[id^="topic-input-desc-"]');
    if (titleField) titleField.value = snapshot.title;
    if (descriptionField) descriptionField.value = snapshot.desc;

    // Restore the file preview if it exists
    const fileGroupContainer = expandedItem.querySelector('.topic-form-group.file');
    if (fileGroupContainer) {
        fileGroupContainer.querySelectorAll('.topic-file-exists[data-new-preview="true"]').forEach(newPrev => newPrev.remove());
        const allPreviews = Array.from(fileGroupContainer.querySelectorAll('.topic-file-exists'));
        allPreviews.slice(1).forEach(extra => extra.remove());
        let currentPreview = fileGroupContainer.querySelector('.topic-file-exists');
        const fileInput = fileGroupContainer.querySelector('.update-file-input, .file-input');

        if (snapshot.hadFile) {
            if (!currentPreview && snapshot.fileHTML) {
                const wrapper = document.createElement('div');
                wrapper.innerHTML = snapshot.fileHTML.trim();
                const restoredPreview = wrapper.firstElementChild;
                if (fileInput) fileGroupContainer.insertBefore(restoredPreview, fileInput); else fileGroupContainer.appendChild(restoredPreview);
                currentPreview = restoredPreview;
            } else if (currentPreview) {
                currentPreview.style.display = 'flex';
            }
            if (fileInput) {
                fileInput.value = '';
                if (fileInput.classList.contains('update-file-input')) fileInput.hidden = true;
            }
            if (currentPreview) currentPreview.classList.remove('edit-mode');
        } else {
            if (currentPreview) currentPreview.remove();
            if (fileInput) {
                fileInput.hidden = false;
                fileInput.value = '';
            }
        }
    }
    // Immediately clear stored snapshot after restore
    delete expandedItem.dataset.originalState;
    delete expandedItem.dataset.snapshotTaken;
}

function enterEditMode(topicItem) {
    const expandedItem = topicItem.querySelector('.topic-item-expanded');
    if (!expandedItem || expandedItem.classList.contains('edit-mode')) return;

    // Take a snapshot of the current state before entering edit mode
    saveCurrentData(expandedItem);

    topicItem.classList.add('edit-mode');
    expandedItem.classList.add('edit-mode');
    expandedItem.querySelectorAll('input').forEach(input => input.removeAttribute('readonly'));
    expandedItem.querySelectorAll('textarea').forEach(textarea => textarea.removeAttribute('disabled'));
    const filePreview = expandedItem.querySelector('.topic-file-exists');
    if (filePreview) filePreview.classList.add('edit-mode');
    const editButtonsGroup = expandedItem.querySelector('.edit-topic-buttons-group');
    const viewButtonsGroup = expandedItem.querySelector('.topic-buttons-group');
    if (editButtonsGroup) editButtonsGroup.style.display = 'flex';
    if (viewButtonsGroup) viewButtonsGroup.style.display = 'none';
    const collapseButton = expandedItem.querySelector('.collapse-button');
    if (collapseButton) collapseButton.classList.add('edit-mode');
}

function exitEditMode(topicItem) {
    const expandedItem = topicItem.querySelector('.topic-item-expanded');
    if (!expandedItem) return;
    restoreData(expandedItem);
    const assignmentField = expandedItem.querySelector('.assignment');
    if (assignmentField) {
        assignmentField.value = '';
    }
    topicItem.classList.remove('edit-mode');
    expandedItem.classList.remove('edit-mode');
    expandedItem.querySelectorAll('input').forEach(input => input.setAttribute('readonly', 'true'));
    expandedItem.querySelectorAll('textarea').forEach(textarea => textarea.setAttribute('disabled', 'true'));
    const editButtonsGroup = expandedItem.querySelector('.edit-topic-buttons-group');
    const viewButtonsGroup = expandedItem.querySelector('.topic-buttons-group');
    if (editButtonsGroup) editButtonsGroup.style.display = 'none';
    if (viewButtonsGroup) viewButtonsGroup.style.display = 'flex';
    const collapseButton = expandedItem.querySelector('.collapse-button');
    if (collapseButton) collapseButton.classList.remove('edit-mode');
}

function removeExistingFile(removeIconButton) {
    const expandedItem = removeIconButton.closest('.topic-item-expanded');
    if (!expandedItem || !expandedItem.classList.contains('edit-mode')) return;
    saveCurrentData(expandedItem);
    const fileGroupContainer = expandedItem.querySelector('.topic-form-group.file');
    if (!fileGroupContainer) return;
    const filePreview = fileGroupContainer.querySelector('.topic-file-exists');
    if (filePreview) filePreview.style.display = 'none';

    let updateFileInput = fileGroupContainer.querySelector('.update-file-input');
    if (!updateFileInput) {
        updateFileInput = document.createElement('input');
        updateFileInput.type = 'file';
        updateFileInput.accept = '.pdf,.doc,.docx,.txt';
        updateFileInput.className = 'update-file-input';
        fileGroupContainer.appendChild(updateFileInput);
    }
    updateFileInput.hidden = false;
    updateFileInput.value = '';
    updateFileInput.focus();
}

function showSelectedFilePreview(fileInputElement) {
    if (!fileInputElement.files || !fileInputElement.files[0]) return;
    const fileGroupContainer = fileInputElement.closest('.topic-form-group.file');
    if (!fileGroupContainer) return;

    // Remove existing temp previews
    fileGroupContainer.querySelectorAll('.topic-file-exists[data-new-preview="true"]').forEach(p => p.remove());

    const selectedFile = fileInputElement.files[0];
    const fileExt = (selectedFile.name.lastIndexOf('.') !== -1 ? selectedFile.name.split('.').pop() : '').toUpperCase();
    const objectUrl = URL.createObjectURL(selectedFile);

    // Create a new preview element
    const preview = document.createElement('p');
    preview.className = 'topic-file-exists edit-mode';
    preview.dataset.newPreview = 'true';

    const link = document.createElement('a');
    link.className = 'attachment-link';
    link.href = objectUrl;
    link.target = '_blank';
    link.title = selectedFile.name;

    const iconSpan = document.createElement('span');
    iconSpan.className = 'attachment-icon';
    iconSpan.textContent = '📄';

    const nameSpan = document.createElement('span');
    nameSpan.className = 'name-content';
    nameSpan.textContent = selectedFile.name;

    const extSpan = document.createElement('span');
    extSpan.className = 'attachment-type';
    extSpan.textContent = fileExt;

    link.appendChild(iconSpan);
    link.appendChild(nameSpan);
    link.appendChild(extSpan);

    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.className = 'x-icon';
    removeButton.setAttribute('aria-label', 'Remove selected file');
    removeButton.textContent = '×';

    preview.appendChild(link);
    preview.appendChild(removeButton);

    fileGroupContainer.insertBefore(preview, fileInputElement);
    fileInputElement.hidden = true;

    removeButton.addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();
        preview.remove();
        fileInputElement.value = '';
        fileInputElement.hidden = false;
        fileInputElement.focus();
    });
}

function initEdit() {
    document.querySelectorAll('.edit-topic-button').forEach(editButton => {
        editButton.addEventListener('click', () => {
            const topicItem = editButton.closest('.topic-item');
            if (topicItem) enterEditMode(topicItem);
        });
    });
    document.querySelectorAll('.cancel-edit-button').forEach(cancelButton => {
        cancelButton.addEventListener('click', () => {
            const topicItem = cancelButton.closest('.topic-item');
            if (topicItem) exitEditMode(topicItem);
        });
    });
    document.addEventListener('click', e => {
        const removeIconButton = e.target.closest('.topic-file-exists:not([data-new-preview]) .x-icon');
        if (!removeIconButton) return;
        const expandedItem = removeIconButton.closest('.topic-item-expanded');
        if (!expandedItem || !expandedItem.classList.contains('edit-mode')) return;
        removeExistingFile(removeIconButton);
    });
    document.addEventListener('change', e => {
        const target = e.target;
        if (target.matches('input[type="file"].update-file-input, input[type="file"].file-input')) {
            showSelectedFilePreview(target);
        }
    });

}

// Event delegation setup
document.addEventListener('DOMContentLoaded', () => {
    window.initEdit();
});

