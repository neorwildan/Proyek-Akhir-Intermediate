export function showFormattedDate(date) {
  const options = { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit' 
  };
  return new Date(date).toLocaleDateString('id-ID', options);
}

export function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => toast.remove(), 3000);
}

export function truncateText(text, maxLength = 100) {
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}