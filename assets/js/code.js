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
  if (button.classList.contains('!bg-green-500')) return;
  // make button have green background
  button.classList.add('!bg-green-500', 'scale-105');
  // remove it after 1 second
  setTimeout(() => {
    button.classList.remove('!bg-green-500', 'scale-105');
  }, 1000);
}
function highlight(target) {
  // get the elements
  var elements = document.querySelectorAll(target);
  // loop over each element
  for (var i = 0; i < elements.length; i++) {
    // get the text from the p element
    var text = elements[i].textContent;
    // if there is no text, continue
    if (!text) continue;
    // create a regular expression to match text in parentheses
    var regex = /\(([a-z])\)/gi;
    // replace the matched text with a mark element
    text = text.replace(regex, function (match, p1) {
      // Create a mark element
      var mark = document.createElement('mark');
      // set the color attribute based on the letter
      if (p1 === 'a') {
        mark.setAttribute('green', true);
      } else if (p1 === 'b') {
        mark.setAttribute('blue', true);
      } else if (p1 === 'c') {
        mark.setAttribute('orange', true);
      } else if (p1 === 'd') {
        mark.setAttribute('indigo', true);
      } else if (p1 === 'de') {
        mark.setAttribute('red', true);
      }
      // set the text of the mark element
      mark.textContent = `(${p1})`;
      // return the mark element as a string
      return mark.outerHTML;
    });
    // update the element with the modified text
    elements[i].innerHTML = text;
  }
}

// update page title
document.title = `Case Play ${code()}`;
// highlight text
highlight('p');
highlight('span');
