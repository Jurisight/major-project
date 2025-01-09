import os
import re
import zipfile
from langdetect import detect, DetectorFactory
from wordsegment import load, segment
import shutil

# Initialize consistent results for langdetect
DetectorFactory.seed = 0

# Load the word segmentation model
load()

def preprocess_text_with_segmentation(text):
    # Step 1: Split text into lines
    lines = text.splitlines()
    if len(lines) > 1:
        link = lines[0]  # Preserve the first line as the link
        content = "\n".join(lines[1:])  # Exclude the first line for preprocessing
    else:
        link = text
        content = ""

    # Step 2: Add spaces between incorrectly concatenated words using regex
    content = re.sub(r'(?<=[a-z])(?=[A-Z])', ' ', content)  # lowercase followed by uppercase
    content = re.sub(r'(?<=[\d])(?=[A-Za-z])', ' ', content)  # digits followed by letters
    content = re.sub(r'(?<=[A-Za-z])(?=[\d])', ' ', content)  # letters followed by digits
    content = re.sub(r'(?<=[^\s])(?=[\(\[\{])', ' ', content)  # Special character joins

    # Step 3: Normalize whitespace
    content = re.sub(r'\s+', ' ', content).strip()

    # Step 4: Split concatenated words using `wordsegment`
    words = content.split()  # Tokenize the content into words
    segmented_words = [' '.join(segment(word)) for word in words]  # Correct each word

    # Step 5: Combine the segmented words back into text
    content = ' '.join(segmented_words)

    # Step 6: Detect and retain only English content
    def is_english(sentence):
        try:
            return detect(sentence) == 'en'
        except:
            return False

    english_sentences = [sentence for sentence in content.split('. ') if is_english(sentence)]

    # Combine English sentences back into a single text
    content = '. '.join(english_sentences)

    # Step 7: Convert text to lowercase for consistency
    content = content.lower()

    # Step 8: Prepend the link back as the first line
    processed_text = f"{link}\n{content}"

    return processed_text

def preprocess_zip(input_zip_path, output_zip_path):
    # Temporary folder to extract files
    temp_dir = "temp_extracted"
    os.makedirs(temp_dir, exist_ok=True)

    # Extract zip contents
    with zipfile.ZipFile(input_zip_path, 'r') as zip_ref:
        zip_ref.extractall(temp_dir)

    # Prepare output directory
    processed_dir = "processed_files"
    os.makedirs(processed_dir, exist_ok=True)

    # Process each .txt file inside subfolders
    for root, _, files in os.walk(temp_dir):
        for file in files:
            if file.endswith('.txt'):
                input_file_path = os.path.join(root, file)
                # Relative path to preserve folder structure
                relative_path = os.path.relpath(input_file_path, temp_dir)
                output_file_path = os.path.join(processed_dir, relative_path)

                # Ensure the output folder exists
                os.makedirs(os.path.dirname(output_file_path), exist_ok=True)

                # Read and preprocess the text
                with open(input_file_path, 'r', encoding='utf-8') as f:
                    raw_text = f.read()

                processed_text = preprocess_text_with_segmentation(raw_text)

                # Save the processed text
                with open(output_file_path, 'w', encoding='utf-8') as f:
                    f.write(processed_text)

    # Create a new zip file with processed files
    with zipfile.ZipFile(output_zip_path, 'w') as zip_out:
        for root, _, files in os.walk(processed_dir):
            for file in files:
                file_path = os.path.join(root, file)
                arcname = os.path.relpath(file_path, processed_dir)  # Preserve relative paths
                zip_out.write(file_path, arcname)

    # Cleanup temporary directories
    shutil.rmtree(temp_dir)
    shutil.rmtree(processed_dir)

    print(f"Processing complete. Processed files saved to {output_zip_path}")

# Paths to input and output zip files
input_zip_path = "writ.zip"  # Replace with your uploaded zip file path
output_zip_path = 'processed_writ.zip'

# Run the preprocessing
preprocess_zip(input_zip_path, output_zip_path)
