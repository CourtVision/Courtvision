from PIL import Image
import sys

def square_image(img_path, out_path):
    img = Image.open(img_path)
    width, height = img.size
    max_dim = max(width, height)
    
    # Create a transparent square background
    new_img = Image.new('RGBA', (max_dim, max_dim), (0, 0, 0, 0))
    
    # Paste the original image in the center
    paste_x = (max_dim - width) // 2
    paste_y = (max_dim - height) // 2
    new_img.paste(img, (paste_x, paste_y))
    
    new_img.save(out_path)

if __name__ == "__main__":
    square_image(sys.argv[1], sys.argv[2])
