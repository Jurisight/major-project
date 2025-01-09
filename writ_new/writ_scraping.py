import os
import requests
from bs4 import BeautifulSoup
import time

# Constants
SEARCH_QUERIES = ['mandamus', 'habeas corpus', 'quo warranto', 'certiorari', 'prohibition']
NUM_PAGES = 40

BASE_URL = 'https://indiankanoon.org/search/?formInput='
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3"
}

# Base folder to store judgments
OUTPUT_DIR = "writ"
os.makedirs(OUTPUT_DIR, exist_ok=True)

def scrape_indian_kanoon(search_term, num_pages, output_dir):
    file_count = 1
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
                case_url = "https://indiankanoon.org" + item.find("a")["href"]

                # Fetch the detailed case judgment
                case_response = requests.get(case_url, headers=HEADERS)
                case_soup = BeautifulSoup(case_response.content, 'html.parser')
                judgment_text = " ".join([p.get_text(strip=True) for p in case_soup.find_all("p")])

                # Save the judgment text and URL to a file
                if judgment_text.strip():
                    filename = os.path.join(output_dir, f"{file_count}.txt")
                    with open(filename, 'w', encoding='utf-8') as file:
                        file.write(f"{case_url}\n\n{judgment_text}")
                    print(f"Saved {filename}")
                    file_count += 1
            except Exception as e:
                print(f"Error processing case: {e}")

        print(f"Scraped page {page} for {search_term}")
        time.sleep(2)  # Be respectful to the server and avoid being blocked

if __name__ == "__main__":
    for query in SEARCH_QUERIES:
        # Create a separate folder for each query
        query_dir = os.path.join(OUTPUT_DIR, query.replace(' ', '_'))
        os.makedirs(query_dir, exist_ok=True)
        
        print(f"Scraping data for: {query}")
        scrape_indian_kanoon(query, NUM_PAGES, query_dir)
    print("Data scraping completed.")
