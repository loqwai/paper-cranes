#!/usr/bin/env python3
import os

def process_file(filepath):
    print(f"Processing file: {filepath}")
    with open(filepath, 'r') as file:
        lines = file.readlines()

    has_pi = any('PI' in line for line in lines)
    if not has_pi:
        return  # Skip files that do not reference PI

    insert_index = -1
    for i, line in enumerate(lines):
        if 'uniform' in line:
            insert_index = i + 1  # Update last line with 'uniform'

    if insert_index != -1:
        # Insert the '#define PI ...' after the last 'uniform' line
        lines.insert(insert_index, '#define PI 3.1415926535897932384626433832795\n')
        with open(filepath, 'w') as file:
            file.writelines(lines)
        print(f"Updated file: {filepath}")

def traverse_directory(directory):
    print(f"Traversing directory: {directory}")
    for root, dirs, files in os.walk(directory):
        for file in files:
            #print file name
            print(file)
            if file.endswith('.frag'):  # Specify the file extension you want to check
                process_file(os.path.join(root, file))

# Example usage
directory_path = '/Users/redaphid/Projects/paper-cranes/shaders'
traverse_directory(directory_path)
