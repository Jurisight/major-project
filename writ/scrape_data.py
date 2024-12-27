import requests
from bs4 import BeautifulSoup
import json
import time

# Constants
SEARCH_QUERIES = ['mandamus', 'habeas corpus', 'quo warranto', 'certiorari', 'prohibition']
NUM_PAGES = 40
BASE_URL = 'https://indiankanoon.org/search/?formInput='
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3"
}

def scrape_indian_kanoon(search_term, num_pages):
    results = []
    for page in range(1, num_pages + 1):
        # Modify the URL to include `doctypes:judgments` for filtering judgments only
        url = f"{BASE_URL}{search_term.replace(' ', '+')}+doctypes:judgments&pagenum={page}"
        response = requests.get(url, headers=HEADERS)
        
        if response.status_code != 200:
            print(f"Failed to fetch page {page}: {response.status_code}")
            continue
        
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Locate the results
        result_titles = soup.find_all("div", class_="result_title")
        if not result_titles:
            print(f"No results found on page {page} for {search_term}")
            break
        
        for item in result_titles:
            try:
                case_title = item.get_text(strip=True)
                case_url = "https://indiankanoon.org" + item.find("a")["href"]

                # Fetch the detailed case judgment
                case_response = requests.get(case_url, headers=HEADERS)
                case_soup = BeautifulSoup(case_response.content, 'html.parser')
                judgment_text = " ".join([p.get_text(strip=True) for p in case_soup.find_all("p")])

                results.append({
                    "title": case_title,
                    "url": case_url,
                    "judgment": judgment_text
                })
            except Exception as e:
                print(f"Error processing case: {e}")

        print(f"Scraped page {page} for {search_term}")
        time.sleep(2)  # Be respectful to the server and avoid being blocked

    return results

def save_to_json(data, filename='indian_kanoon_data.json'):
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=4)

if __name__ == "__main__":
    all_results = {}
    for query in SEARCH_QUERIES:
        print(f"Scraping data for: {query}")
        results = scrape_indian_kanoon(query, NUM_PAGES)
        all_results[query] = results
    save_to_json(all_results)
    print("Data scraping completed.")
