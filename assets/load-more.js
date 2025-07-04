const reviews_on_page = document.querySelector('.review-list');
const nextUrl = document.getElementById('paginateNext');
let next_url = nextUrl.dataset.nextUrl;

const load_more_btn = document.getElementsByClassName('load-more_btn')[0];
const load_more_spinner = document.getElementsByClassName('loading__spinner')[0];
async function getNextPage() {
  try {
    let res = await fetch(next_url);
    return await res.text();
  } catch (error) {
    console.log(error);
  }
}

async function loadMoreProducts() {
  load_more_btn.style.display = 'none';
  load_more_spinner.classList.remove('hidden');
  let nextPage = await getNextPage();

  const parser = new DOMParser();
  const nextPageDoc = parser.parseFromString(nextPage, 'text/html');

  load_more_spinner.classList.add('hidden');

  const review_list = nextPageDoc.querySelector('.review-list');
  const new_review_item = review_list.getElementsByClassName('review-item');
  const newUrl = nextPageDoc.getElementById('paginateNext');
  const new_url = newUrl ? newUrl.dataset.nextUrl : null;
  if (new_url) {
    load_more_btn.style.display = 'flex';
  }
  next_url = new_url;
  for (let i = 0; i < new_review_item.length; i++) {
    reviews_on_page.appendChild(new_review_item[i]);
  }
}
