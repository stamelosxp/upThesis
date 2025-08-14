function showNewTopic() {
    const newTopicItem = document.querySelector(".topic-item-expanded.new-mode");

    if (newTopicItem) {
        newTopicItem.style.display = "flex";
        newTopicItem.scrollIntoView({behavior: "smooth", block: "center"});
    }
}

function cancelNewTopic() {
    const newTopicItem = document.querySelector('.topic-item-expanded.new-mode');
    if (newTopicItem) {
        newTopicItem.style.display = "none";
        // clear all input fields
        newTopicItem.querySelectorAll('input[type="text"], input[type="file"], textarea').forEach(input => {
            input.value = '';
        });

        const assignmentInput = newTopicItem.querySelector('.assignment');
        if (assignmentInput) {
            assignmentInput.value = '';
        }

        // Remove all file previews
        const fileGroupContainer = newTopicItem.querySelector('.topic-form-group.file');
        if (fileGroupContainer) {
            fileGroupContainer.querySelectorAll('.topic-file-exists').forEach(p => p.remove());
            // Show the file input again
            const fileInput = fileGroupContainer.querySelector('input[type="file"]');
            if (fileInput) {
                fileInput.hidden = false;
            }

        }


    }

}

function showNewTopicFilePreview(fileInputElement) {
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

document.addEventListener('DOMContentLoaded', () => {
    const newTopicButton = document.getElementById('new-topic-button');
    if (newTopicButton) {
        newTopicButton.addEventListener('click', (e) => {
            e.preventDefault();
            showNewTopic(newTopicButton);
        });
    }

    const cancelNewTopicButton = document.getElementById('cancel-new-topic-button');
    if (cancelNewTopicButton) {
        cancelNewTopicButton.addEventListener('click', (e) => {
            e.preventDefault();
            cancelNewTopic();
        });
    }

    const fileInputs = document.querySelectorAll('.topic-form-group.file input[type="file"]');
    fileInputs.forEach(input => {
        input.addEventListener('change', () => showNewTopicFilePreview(input));
    });
});