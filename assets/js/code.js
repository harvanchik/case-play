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
  // get button element with id "share
  const button = document.querySelector('#share');
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
    var letterRegex = /\(([a-z])\)/g;
    // replace the matched text with a mark element
    text = text.replace(letterRegex, (match, p1) => {
      // create a mark element
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
      mark.textContent = match;
      // return the mark element as a string
      return mark.outerHTML;
    });
    // create a regular expression to match teams
    var teamRegex = /Team ([ABKR])|[ABKR]-[0-9]{1,2}/g;
    // replace the matched text with a team element
    text = text.replace(teamRegex, (match, p1) => {
      // create a team element
      var team = document.createElement('team');
      // set the text of the team element
      team.textContent = match;
      // return the team element as a string
      return team.outerHTML;
    });
    // create a regular expression to match team yard lines
    // var yardRegex = /[ABKR]'s\s[1-4]?[0-9]/g;
    var yardRegex = /([ABKR]'s\s[1-4]?[0-9])|([ABKR]'s)/g;
    // replace the matched text with a bold element
    text = text.replace(yardRegex, (match, p1) => {
      // create a bold element
      var team = document.createElement('bold');
      // set the text of the bold element
      team.textContent = match;
      // return the bold element as a string
      return team.outerHTML;
    });
    // update the element with the modified text
    elements[i].innerHTML = text;
  }
}
function getCasePlays() {
  return ['a5b', 'a5c', 'b7a', 'c3f', 'g4a', 'h6a', 's3g', 'w0a', 'y7i', 'z9a'];
  // const dir = window.location.origin.includes('localhost')
  //   ? '/case/'
  //   : `${window.location.href.replace('index.html', '')}case/`;
  // // TODO: fix this so it works on github pages

  // // use the fetch API to get the list of files from the directory
  // const response = await fetch(dir);
  // // get the response text as a string
  // const fileList = await response.text();
  // // extract the file names from the response
  // const fileNames = fileList.match(/href="([^"]*\.html)/g);
  // // return the file names
  // return fileNames.map(name => name.substring(6).replace('.html', '').replace('/case/', ''));
}

function getCasePlayURL(casePlay) {
  return window.location.origin.includes('localhost')
    ? `/case/${casePlay}.html`
    : `${window.location.href.replace('index.html', '')}case/${casePlay}.html`;
}

// update page title
document.title = `Case Play ${code()}`;
// highlight text
highlight('p');
highlight('span');
