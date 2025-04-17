 #!/bin/bash
TARGET_DIR="content/articles"
echo "Starting rename process in $TARGET_DIR..."

# Check if target directory exists
if [ ! -d "$TARGET_DIR" ]; then
  echo "Error: Directory $TARGET_DIR not found."
  exit 1
fi

cd "$TARGET_DIR" || exit 1
echo "Changed directory to $(pwd)"

# Regex to capture the timestamp part ending in Z
regex='^([0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z)-.*\.md$'

renamed_count=0
skipped_count=0
error_count=0

# Use find for potentially better handling of large number of files
find . -maxdepth 1 -name '*.md' -print0 | while IFS= read -r -d $'\0' f; do
  # Remove ./ prefix from find result
  filename="${f#./}"

  # Check if the file matches the expected pattern with a timestamp and slug
  if [[ "$filename" =~ $regex ]]; then
    timestamp="${BASH_REMATCH[1]}"
    newName="${timestamp}.md"

    # Ensure we don't try to rename if the name is already correct or extraction failed
    if [[ "$filename" != "$newName" && -n "$timestamp" ]]; then
      echo "Renaming '$filename' to '$newName'"
      # Execute git mv and capture potential errors
      if git mv "$filename" "$newName"; then
        ((renamed_count++))
      else
        echo "Error renaming '$filename' to '$newName'"
        ((error_count++))
      fi
    else
       echo "Skipping '$filename' (already short or pattern mismatch?)"
       ((skipped_count++))
    fi
  else
    echo "Skipping '$filename' (does not match expected timestamp-slug pattern)"
    ((skipped_count++))
  fi
done

echo "Finished renaming."
echo "Renamed: $renamed_count files."
echo "Skipped: $skipped_count files."
echo "Errors: $error_count files."

# Go back to the original directory (usually project root)
cd - > /dev/null # Suppress cd output

# Exit with error code if any git mv failed
if [ "$error_count" -gt 0 ]; then
  exit 1
fi

exit 0
