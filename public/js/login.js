const messages = {
  missing: 'Please enter both a username and a password.',
  password: 'Wrong password for that username.'
}
const error = new URLSearchParams(location.search).get('error')
if (error in messages) {
  const p = document.querySelector('#error')
  p.textContent = messages[error]
  p.hidden = false
}
