function code() {
  // get code from url
  const url = new URL(window.location.href);
  // code is characters after last slash and before .html
  return url.pathname.substring(url.pathname.lastIndexOf('/') + 1, url.pathname.lastIndexOf('.'));
}
function link() {
  // get url
  return `https://jake.harvanchik.me/case/?p=${code()}.html`;
}
function copied() {
  // get button element
  const button = document.querySelector('button');
  // if button already has green background, return
  if (button.classList.contains('!bg-green-600')) return;
  // make button have green background
  button.classList.add('!bg-green-600', 'scale-105');
  // remove it after 1 second
  setTimeout(() => {
    button.classList.remove('!bg-green-600', 'scale-105');
  }, 1000);
}

// update page title
document.title = `Case Play ${code()}`;
