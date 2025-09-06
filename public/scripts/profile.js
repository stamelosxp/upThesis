function hasSpace(inputText) {
    // Check for whitespace characters
    return /\s/.test(inputText);
}

function hasSpecialChar(inputText) {
    // Accepts only letters, numbers, and underscore
    return /[^a-zA-Z0-9_]/.test(inputText);
}

function emailCheck(enteredEmail) {
    if (enteredEmail.length === 0) {
        return 'empty';
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(enteredEmail)) {
        return "invalid";
    }
    return null;
}

function phoneCheck(inputPhone, type) {
    if (inputPhone.length === 0 && type === "mobile") {
        return 'empty';
    }

    if (inputPhone.length !== 10) {
        return 'invalid';
    }

    // Check for non-digit characters
    if (/\D/.test(inputPhone)) {
        return 'invalid';
    }


    if (!inputPhone.startsWith('69') && type === "mobile") {
        return 'invalid';
    } else if (!inputPhone.startsWith('2') && type === "phone") {
        return 'invalid';
    }
    return null;
}

async function checkUsername(inputUsername, abortSignal) {
    if (hasSpace(inputUsername)) {
        return 'invalid-space';
    }
    if (hasSpecialChar(inputUsername)) {
        return 'invalid-char';
    }
    const trimmedUsername = inputUsername.trim();
    if (trimmedUsername.length === 0) {
        return 'empty';
    }
    if (trimmedUsername.length < 5 || trimmedUsername.length > 10) {
        return 'invalid-length';
    }


    try {
        const response = await fetch(`/api/available/username/${encodeURIComponent(trimmedUsername)}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            },
            signal: abortSignal
        });

        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const data = await response.json();
        if (data.available === false) {
            return 'invalid-exists';
        } else {
            return null;
        }
    } catch (error) {
        if (error.name === 'AbortError') {
            return 'aborted';
        }
        console.error('Error checking username:', error);
        return 'error';
    }
}

function checkPassword(inputPassword, type) {
    const oldPassword = document.querySelector('#old_password')
    const newPassword = document.querySelector('#new_password')
    const confirmPassword = document.querySelector('#confirm_password')


    if (type === 'new_password' || type === 'confirm_password') {
        if (oldPassword.value.length === 0) {
            return 'empty';
        } else if (inputPassword.length < 5 || inputPassword.length > 20) {
            return 'invalid-length';
        } else {
            if (type === 'new_password') {
                if (confirmPassword.value.length > 0) {
                    const labelConfirmPassword = document.getElementById('label-confirm_password');
                    const spanWarningConfirmPassword = labelConfirmPassword.querySelector('span');
                    spanWarningConfirmPassword.classList.remove('yellow', 'red', 'green');
                    spanWarningConfirmPassword.textContent = '';

                    const checkConfirm = checkPassword(confirmPassword.value, confirmPassword.id);
                    if (checkConfirm) {
                        confirmPassword.classList.remove('valid');
                        if (checkConfirm === 'empty') {
                            spanWarningConfirmPassword.textContent = 'Απαιτείται ο παλιός';
                            spanWarningConfirmPassword.classList.add('yellow');

                        } else if (checkConfirm === 'invalid-length') {
                            spanWarningConfirmPassword.textContent = '5-20 χαρακτήρες';
                            spanWarningConfirmPassword.classList.add('red');
                        } else if (checkConfirm === 'mismatch') {
                            spanWarningConfirmPassword.textContent = 'Δεν ταιριάζουν';
                            spanWarningConfirmPassword.classList.add('red');
                        }
                    } else {
                        spanWarningConfirmPassword.textContent = 'Έγκυρος κωδικός';
                        spanWarningConfirmPassword.classList.add('green');
                        confirmPassword.classList.add('valid');
                        return null
                    }
                } else {
                    return null
                }
            } else if (type === 'confirm_password') {
                if (newPassword.value !== confirmPassword.value) {
                    return 'mismatch';
                }
                return null
            }

        }

    } else if (type === 'old_password') {

        if (newPassword.value.length > 0) {
            const labelNewPassword = document.getElementById('label-new_password');
            const spanWarningNewPassword = labelNewPassword.querySelector('span');
            spanWarningNewPassword.classList.remove('yellow', 'red', 'green');
            spanWarningNewPassword.textContent = '';

            const checkNew = checkPassword(newPassword.value, newPassword.id);
            if (checkNew) {
                newPassword.classList.remove('valid')
                if (checkNew === 'empty') {
                    spanWarningNewPassword.textContent = 'Απαιτείται ο παλιός';
                    spanWarningNewPassword.classList.add('yellow');
                } else if (checkNew === 'invalid-length') {
                    spanWarningNewPassword.textContent = '5-20 χαρακτήρες';
                    spanWarningNewPassword.classList.add('red');
                }

            } else {
                spanWarningNewPassword.textContent = 'Έγκυρος κωδικός';
                spanWarningNewPassword.classList.add('green');
                newPassword.classList.add('valid');
            }
        }

        if (confirmPassword.value.length > 0) {
            const labelConfirmPassword = document.getElementById('label-confirm_password');
            const spanWarningConfirmPassword = labelConfirmPassword.querySelector('span');
            spanWarningConfirmPassword.classList.remove('yellow', 'red', 'green');
            spanWarningConfirmPassword.textContent = '';

            const checkConfirm = checkPassword(confirmPassword.value, confirmPassword.id);
            if (checkConfirm) {
                confirmPassword.classList.remove('valid');
                if (checkConfirm === 'empty') {
                    spanWarningConfirmPassword.textContent = 'Απαιτείται ο παλιός';
                    spanWarningConfirmPassword.classList.add('yellow');

                } else if (checkConfirm === 'invalid-length') {
                    spanWarningConfirmPassword.textContent = '5-20 χαρακτήρες';
                    spanWarningConfirmPassword.classList.add('red');
                } else if (checkConfirm === 'mismatch') {
                    spanWarningConfirmPassword.textContent = 'Δεν ταιριάζουν';
                    spanWarningConfirmPassword.classList.add('red');
                }
            } else {
                spanWarningConfirmPassword.textContent = 'Έγκυρος κωδικός';
                spanWarningConfirmPassword.classList.add('green');
                confirmPassword.classList.add('valid');
            }
        }


        if (inputPassword.length < 5 || inputPassword.length > 20) {
            return 'invalid-length';
        } else {
            return null
        }

    }

}

function clearComData(communicationInfoGroup) {
    const cancelCommInputs = communicationInfoGroup.querySelector('#cancel-com-data');
    if (cancelCommInputs) {
        cancelCommInputs.addEventListener('click', event => {
            const commInputs = communicationInfoGroup.querySelectorAll('input');
            // const commLabels = communicationInfoGroup.querySelectorAll('label');
            commInputs.forEach(input => {
                input.value = input.dataset.originalValue;
                input.classList.remove('modified', 'valid');
                const label = communicationInfoGroup.querySelector(`label[for="${input.id}"]`);
                if (label) {
                    const spanWarning = label.querySelector('span');
                    if (spanWarning) {
                        spanWarning.textContent = '';
                        spanWarning.classList.remove('yellow', 'red', 'green');
                    }
                }
            });

            const commButton = document.querySelector('.form-button-group.communication');
            if (commButton) {
                commButton.classList.add('hidden');
            }
        })
    }

}

function changeCommInputs(commInputs) {
    commInputs.forEach(input => {
        const originalValue = input.dataset.originalValue;
        input.addEventListener('input', function () {
            const trimmedValue = input.value.trim();
            if (originalValue !== trimmedValue) {
                input.classList.add('modified');
                // Remove 'correct' class before validation
                input.classList.remove('valid');
                let isValid = false;
                if (input.id === 'email') {
                    const resCheckEmail = emailCheck(trimmedValue);
                    const labelEmail = document.getElementById('label-email');
                    const spanWarningEmail = labelEmail.querySelector('span');
                    spanWarningEmail.classList.remove('yellow', 'red', 'green');
                    if (resCheckEmail) {
                        if (resCheckEmail === 'empty') {
                            spanWarningEmail.textContent = 'Απαιτείται';
                            spanWarningEmail.classList.add('yellow');
                        } else if (resCheckEmail === 'invalid') {
                            spanWarningEmail.textContent = 'email@example.com';
                            spanWarningEmail.classList.add('red');
                        }
                    } else {
                        if (trimmedValue.length > 0) {
                            spanWarningEmail.textContent = 'Έγκυρο email';
                            spanWarningEmail.classList.add('green');
                            isValid = true;
                        } else {
                            spanWarningEmail.textContent = '';
                        }
                    }
                } else if (input.id === 'mobile') {
                    const resCheckMobile = phoneCheck(trimmedValue, 'mobile');
                    const labelMobile = document.getElementById('label-mobile');
                    const spanWarningMobile = labelMobile.querySelector('span');
                    spanWarningMobile.classList.remove('yellow', 'red', 'green');
                    if (resCheckMobile) {
                        if (resCheckMobile === 'empty') {
                            spanWarningMobile.textContent = 'Απαιτείται';
                            spanWarningMobile.classList.add('yellow');
                        } else if (resCheckMobile === 'invalid') {
                            spanWarningMobile.textContent = 'π.χ. 6941234567';
                            spanWarningMobile.classList.add('red');
                        }
                    } else {
                        if (trimmedValue.length > 0) {
                            spanWarningMobile.textContent = 'Έγκυρο τηλέφωνο';
                            spanWarningMobile.classList.add('green');
                            isValid = true;
                        } else {
                            spanWarningMobile.textContent = '';
                        }
                    }
                } else if (input.id === 'phone') {
                    const resCheckPhone = phoneCheck(trimmedValue, 'phone');
                    const labelPhone = document.getElementById('label-phone');
                    const spanWarningPhone = labelPhone.querySelector('span');
                    spanWarningPhone.classList.remove('yellow', 'red', 'green');
                    if (resCheckPhone) {
                        if (resCheckPhone === 'invalid') {
                            spanWarningPhone.textContent = 'π.χ. 2101234567';
                            spanWarningPhone.classList.add('red');
                        }
                    } else {
                        if (trimmedValue.length > 0) {
                            spanWarningPhone.textContent = 'Έγκυρο τηλέφωνο';
                            spanWarningPhone.classList.add('green');
                            isValid = true;
                        } else {
                            spanWarningPhone.textContent = '';
                        }
                    }
                }
                // Add 'correct' class if valid
                if (isValid) {
                    input.classList.add('valid');
                }
                const commButton = document.querySelector('.form-button-group.communication');
                if (commButton) {
                    commButton.classList.remove('hidden');
                }
            } else {
                input.classList.remove('modified', 'valid');
                if (input.id === 'email') {
                    const labelEmail = document.getElementById('label-email');
                    const spanWarningEmail = labelEmail.querySelector('span');
                    spanWarningEmail.textContent = '';
                    spanWarningEmail.classList.remove('yellow', 'red', 'green');
                } else if (input.id === 'mobile') {
                    const labelMobile = document.getElementById('label-mobile');
                    const spanWarningMobile = labelMobile.querySelector('span');
                    spanWarningMobile.textContent = '';
                    spanWarningMobile.classList.remove('yellow', 'red', 'green');
                } else if (input.id === 'phone') {
                    const labelPhone = document.getElementById('label-phone');
                    const spanWarningPhone = labelPhone.querySelector('span');
                    spanWarningPhone.textContent = '';
                    spanWarningPhone.classList.remove('yellow', 'red', 'green');
                }
                const commButton = document.querySelector('.form-button-group.communication');
                if (commButton) {
                    const anyModified = Array.from(commInputs).some(inp => inp.classList.contains('modified'));
                    if (!anyModified) {
                        commButton.classList.add('hidden');
                    }
                }
            }
        });
    });
}

function clearAccData(accountInfoGroup) {
    const cancelAccInputs = accountInfoGroup.querySelector('#cancel-acc-data');
    if (cancelAccInputs) {
        cancelAccInputs.addEventListener('click', event => {
            const accInputs = accountInfoGroup.querySelectorAll('input');
            accInputs.forEach(input => {
                if (input.id !== 'photo') {
                    input.value = input.dataset.originalValue;
                    input.classList.remove('modified', 'valid');
                    const label = accountInfoGroup.querySelector(`label[for="${input.id}"]`);
                    if (label) {
                        const spanWarning = label.querySelector('span');
                        if (spanWarning) {
                            spanWarning.textContent = '';
                            spanWarning.classList.remove('yellow', 'red', 'green');
                        }
                    }
                    if (input.id === 'new_password' || input.id === 'confirm_password' || input.id === 'old_password') {
                        const showPasswordButton = document.querySelector(`.toggle-password-visibility[data-target="${input.id}"]`);
                        if (showPasswordButton) {
                            const targetInput = document.getElementById(input.id);
                            if (targetInput) {
                                targetInput.type = 'password';
                            }
                            showPasswordButton.querySelector('img').style.opacity = '1';
                        }
                    }
                } else {
                    input.value = '';
                    input.classList.remove('modified', 'valid');
                    const previewImg = document.getElementById('profile-photo-img');
                    if (previewImg) {
                        previewImg.src = input.dataset.originalValue;
                    }
                }
            });


            const accButton = document.querySelector('.form-button-group.account');
            if (accButton) {
                accButton.classList.add('hidden');
            }
        })
    }

}

function changeAccInputs(accInputs) {
    let usernameAbortController = null;
    accInputs.forEach(input => {
        const originalValue = input.dataset.originalValue;
        input.addEventListener('input', function () {
            let trimmedValue = input.value.trim();
            if (input.id === 'old_password' || input.id === 'new_password' || input.id === 'confirm_password') {
                trimmedValue = input.value;
            }

            if (originalValue !== trimmedValue) {
                input.classList.add('modified');
                input.classList.remove('valid');
                let isValid = false;

                if (input.id === 'photo') {
                    input.addEventListener('change', function (e) {
                        const file = input.files && input.files[0];
                        if (file) {
                            const reader = new FileReader();
                            reader.onload = function (event) {
                                const previewImg = document.getElementById('profile-photo-img');
                                if (previewImg) {
                                    previewImg.src = event.target.result;
                                }
                            };
                            reader.readAsDataURL(file);
                        }
                        input.classList.add('valid');
                    });
                } else if (input.id === 'username') {
                    input.classList.remove('valid');
                    let labelUsername = document.getElementById('label-username');
                    let spanWarningUsername = labelUsername ? labelUsername.querySelector('span') : null;
                    if (spanWarningUsername) {
                        spanWarningUsername.classList.remove('yellow', 'red', 'green');
                    }
                    // Abort previous request if exists
                    if (usernameAbortController) {
                        usernameAbortController.abort();
                    }
                    usernameAbortController = new AbortController();
                    (async () => {
                        const resCheckUsername = await checkUsername(trimmedValue, usernameAbortController.signal);
                        if (spanWarningUsername) {
                            if (resCheckUsername === 'empty') {
                                spanWarningUsername.textContent = 'Απαιτείται';
                                spanWarningUsername.classList.add('yellow');
                            } else if (resCheckUsername === 'invalid-length') {
                                spanWarningUsername.textContent = '5-10 χαρακτήρες';
                                spanWarningUsername.classList.add('red');
                            } else if (resCheckUsername === 'invalid-exists') {
                                spanWarningUsername.textContent = 'Χρησιμοποιείται';
                                spanWarningUsername.classList.add('red');
                            } else if (resCheckUsername === 'invalid-space') {
                                spanWarningUsername.textContent = 'Δεν επιτρέπονται κενά';
                                spanWarningUsername.classList.add('red');
                            } else if (resCheckUsername === 'invalid-char') {
                                spanWarningUsername.textContent = 'Επιτρέπονται γράμματα, αριθμοί, _';
                                spanWarningUsername.classList.add('red');
                            } else if (resCheckUsername === 'error') {
                                spanWarningUsername.textContent = 'Σφάλμα ελέγχου';
                                spanWarningUsername.classList.add('red');
                            } else if (resCheckUsername === 'aborted') {
                                // Do nothing on abort
                            } else {
                                if (trimmedValue.length > 0) {
                                    spanWarningUsername.textContent = 'Έγκυρο όνομα';
                                    spanWarningUsername.classList.add('green');
                                    input.classList.add('valid');
                                } else {
                                    spanWarningUsername.textContent = '';
                                }
                            }
                        }
                    })();
                } else if (input.id === 'new_password' || input.id === 'confirm_password' || input.id === 'old_password') {
                    const resCheckPassword = checkPassword(trimmedValue, input.id);
                    const labelPassword = document.getElementById(`label-${input.id}`);
                    const spanWarningPassword = labelPassword.querySelector('span');
                    spanWarningPassword.classList.remove('yellow', 'red', 'green');
                    if (resCheckPassword) {
                        if (resCheckPassword === 'empty') {
                            spanWarningPassword.textContent = 'Απαιτείται ο παλιός';
                            spanWarningPassword.classList.add('yellow');
                        } else if (resCheckPassword === 'invalid-length') {
                            spanWarningPassword.textContent = '5-20 χαρακτήρες';
                            spanWarningPassword.classList.add('red');
                        } else if (resCheckPassword === 'mismatch') {
                            spanWarningPassword.textContent = 'Δεν ταιριάζουν';
                            spanWarningPassword.classList.add('red');
                        }
                    } else {
                        if (trimmedValue.length > 0) {
                            spanWarningPassword.textContent = 'Έγκυρος κωδικός';
                            spanWarningPassword.classList.add('green');
                            input.classList.add('valid');
                        } else {
                            spanWarningPassword.textContent = '';
                        }
                    }
                }
                // Add 'correct' class if valid
                if (input.classList.contains('valid')) {
                    input.classList.add('valid');

                }
                const accButton = document.querySelector('.form-button-group.account');
                if (accButton) {
                    accButton.classList.remove('hidden');
                }
            } else {
                input.classList.remove('modified', 'valid');
                if (input.type === 'text') {
                    const labelUsername = document.getElementById('label-username');
                    const spanWarningUsername = labelUsername.querySelector('span');
                    spanWarningUsername.textContent = '';
                    spanWarningUsername.classList.remove('yellow', 'red', 'green');
                }

                if (input.id === 'new_password' || input.id === 'confirm_password' || input.id === 'old_password') {
                    if (input.id === 'old_password') {
                        const newPassword = document.querySelector('#new_password');
                        const confirmPassword = document.querySelector('#confirm_password');

                        if (newPassword.value.length > 0) {
                            const labelNewPassword = document.getElementById('label-new_password');
                            const spanWarningNewPassword = labelNewPassword.querySelector('span');
                            const checkNew = checkPassword(newPassword.value, newPassword.id);
                            if (checkNew) {
                                newPassword.classList.remove('valid');

                                if (checkNew === 'empty') {
                                    spanWarningNewPassword.textContent = 'Απαιτείται ο παλιός';
                                    spanWarningNewPassword.classList.add('yellow');
                                } else if (checkNew === 'invalid-length') {
                                    spanWarningNewPassword.textContent = '5-20 χαρακτήρες';
                                    spanWarningNewPassword.classList.add('red');
                                }
                            }

                        }

                        if (confirmPassword.value.length > 0) {
                            const labelConfirmPassword = document.getElementById('label-confirm_password');
                            const spanWarningConfirmPassword = labelConfirmPassword.querySelector('span');
                            const checkConfirm = checkPassword(confirmPassword.value, confirmPassword.id);
                            if (checkConfirm) {
                                confirmPassword.classList.remove('valid');
                                if (checkConfirm === 'empty') {
                                    spanWarningConfirmPassword.textContent = 'Απαιτείται ο παλιός';
                                    spanWarningConfirmPassword.classList.add('yellow');

                                } else if (checkConfirm === 'invalid-length') {
                                    spanWarningConfirmPassword.textContent = '5-20 χαρακτήρες';
                                    spanWarningConfirmPassword.classList.add('red');
                                } else if (checkConfirm === 'mismatch') {
                                    spanWarningConfirmPassword.textContent = 'Δεν ταιριάζουν';
                                    spanWarningConfirmPassword.classList.add('red');
                                }
                            }
                        }
                        const labelPassword = document.getElementById(`label-${input.id}`);
                        const spanWarningPassword = labelPassword.querySelector('span');
                        spanWarningPassword.textContent = '';
                        spanWarningPassword.classList.remove('yellow', 'red', 'green');

                    } else {
                        const labelPassword = document.getElementById(`label-${input.id}`);
                        const spanWarningPassword = labelPassword.querySelector('span');
                        spanWarningPassword.textContent = '';
                        spanWarningPassword.classList.remove('yellow', 'red', 'green');
                    }

                }

                const accButton = document.querySelector('.form-button-group.account');
                if (accButton) {
                    // Only hide if no input in the group is modified
                    const anyModified = Array.from(accInputs).some(inp => inp.classList.contains('modified'));
                    if (!anyModified) {
                        accButton.classList.add('hidden');
                    }
                }
            }
        });
    });
}


document.addEventListener("DOMContentLoaded", function () {
    const communicationInfoGroup = document.querySelector('.form-group.communication');
    if (!communicationInfoGroup) {
        return;
    }
    const commInputs = communicationInfoGroup.querySelectorAll('input');
    changeCommInputs(commInputs);
    clearComData(communicationInfoGroup);

    const accountInfoGroup = document.querySelector('.form-group.account');
    if (!accountInfoGroup) {
        return;
    }

    const accInputs = accountInfoGroup.querySelectorAll('input');
    changeAccInputs(accInputs);
    clearAccData(accountInfoGroup);

    // Password visibility toggle logic
    document.querySelectorAll('.toggle-password-visibility').forEach(function (btn) {
        btn.addEventListener('click', function () {
            const targetId = btn.getAttribute('data-target');
            const input = document.getElementById(targetId);
            if (!input) return;
            if (input.type === 'password') {
                input.type = 'text';
                btn.querySelector('img').style.opacity = '0.5';
            } else {
                input.type = 'password';
                btn.querySelector('img').style.opacity = '1';
            }
        });
    });
});
