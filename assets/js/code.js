function code() {
  // get code from url
  const url = new URL(window.location.href);
  // code is characters after last slash and before .html
  return url.pathname.substring(url.pathname.lastIndexOf('/') + 1, url.pathname.lastIndexOf('.'));
}
function link() {
  // get url
  return `https://jake.harvanchik.me/case/?p=${code()}`;
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
    var letterRegex = /\(([a-z])\)/gi;
    // replace the matched text with a mark element
    text = text.replace(letterRegex, function (match, p1) {
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
      } else if (p1 === 'e') {
        mark.setAttribute('red', true);
      }
      // set the text of the mark element
      mark.textContent = `(${p1})`;
      // return the mark element as a string
      return mark.outerHTML;
    });
    // create a regular expression to match 'Team ' and any capital letter
    var teamRegex = /Team ([A-Z])/gi;
    // replace the matched text with a mark element
    text = text.replace(teamRegex, function (match, p1) {
      // Create a mark element
      var team = document.createElement('team');
      // set the text of the mark element
      team.textContent = `Team ${p1}`;
      // return the mark element as a string
      return team.outerHTML;
    });
    // update the element with the modified text
    elements[i].innerHTML = text;
  }
}
async function getCasePlays() {
  // use the fetch API to get the list of files from the directory
  const response = await fetch(`${window.location.origin}/case/`);
  // get the response text as a string
  const fileList = await response.text();
  // extract the file names from the response
  const fileNames = fileList.match(/href="([^"]*\.html)/g);
  // return the file names
  return fileNames.map(name => name.substring(6).replace('.html', '').replace('/case/', ''));
}

// update page title
document.title = `Case Play ${code()}`;
// highlight text
highlight('p');
highlight('span');
