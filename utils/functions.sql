create function incrementClicks(x int, short_url text)
returns void as
$$
  update urls
  set clicks = clicks + x
  where short_url = short_url;
$$
language sql volatile;