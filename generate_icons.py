#!/usr/bin/env python3
"""生成 Chrome 扩展图标"""
from PIL import Image, ImageDraw
import os

icons_dir = os.path.join(os.path.dirname(__file__), 'icons')
os.makedirs(icons_dir, exist_ok=True)

sizes = [16, 48, 128]

for size in sizes:
    # 创建带透明背景的图片
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # 绘制渐变圆形背景（简化为纯色）
    # 绿色到蓝色渐变的中间色
    bg_color = (56, 163, 96)  # 绿色调
    
    # 绘制圆形背景
    draw.ellipse([2, 2, size-3, size-3], fill=bg_color)
    
    # 绘制字幕图标（两条白色横线）
    line_height = max(2, size // 8)
    line_y1 = int(size * 0.32)
    line_y2 = int(size * 0.52)
    line_x1 = int(size * 0.2)
    line_x2 = int(size * 0.8)
    
    # 第一条线（完整）
    draw.rectangle([line_x1, line_y1, line_x2, line_y1 + line_height], fill='white')
    
    # 第二条线（稍短）
    draw.rectangle([line_x1, line_y2, line_x1 + int((line_x2 - line_x1) * 0.7), line_y2 + line_height], fill='white')
    
    # 保存
    filepath = os.path.join(icons_dir, f'icon{size}.png')
    img.save(filepath, 'PNG')
    print(f'Created: {filepath}')

print('All icons generated!')
