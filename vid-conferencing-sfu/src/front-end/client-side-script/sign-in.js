document.getElementById('signInBtn').addEventListener('click', function() {
    document.getElementById('signInForm').style.display = 'block';
    document.getElementById('signUpForm').style.display = 'none';
    this.classList.add('active');
    document.getElementById('signUpBtn').classList.remove('active');
});

document.getElementById('signUpBtn').addEventListener('click', function() {
    document.getElementById('signUpForm').style.display = 'block';
    document.getElementById('signInForm').style.display = 'none';
    this.classList.add('active');
    document.getElementById('signInBtn').classList.remove('active');
});