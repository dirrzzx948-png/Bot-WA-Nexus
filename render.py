import sys
import os
from PIL import Image, ImageDraw, ImageFont

def find_font():
    fonts = [
        '/system/fonts/NotoColorEmoji.ttf',
        '/system/fonts/Roboto-Regular.ttf',
        '/system/fonts/NotoSans-Regular.ttf',
        '/system/fonts/DroidSans.ttf'
    ]
    for f in fonts:
        if os.path.exists(f):
            return f
    return None

def render_text():
    text_type = sys.argv[1]
    text = sys.argv[2]
    output_path = sys.argv[3]

    font_path = find_font()
    
    if text_type == 'textsticker':
        img = Image.new('RGBA', (512, 512), (255, 255, 255, 255))
        draw = ImageDraw.Draw(img)
        
        try:
            font = ImageFont.truetype(font_path, 50) if font_path else ImageFont.load_default()
        except:
            font = ImageFont.load_default()
        
        bbox = draw.multiline_textbbox((0, 0), text, font=font, align="center")
        w = bbox[2] - bbox[0]
        h = bbox[3] - bbox[1]
        x = (512 - w) / 2
        y = (512 - h) / 2
        draw.multiline_text((x, y), text, fill="black", font=font, align="center")
    
    else:
        img = Image.new('RGBA', (512, 120), (0, 0, 0, 0))
        draw = ImageDraw.Draw(img)
        
        try:
            font = ImageFont.truetype(font_path, 38) if font_path else ImageFont.load_default()
        except:
            font = ImageFont.load_default()
            
        bbox = draw.multiline_textbbox((0, 0), text, font=font, align="center")
        w = bbox[2] - bbox[0]
        h = bbox[3] - bbox[1]
        x = (512 - w) / 2
        y = (120 - h) / 2
        draw.multiline_text((x, y), text, fill="white", stroke_width=2, stroke_fill="black", font=font, align="center")

    img.save(output_path, "PNG")

if __name__ == '__main__':
    render_text()
