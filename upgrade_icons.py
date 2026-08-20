import urllib.request
import re

def process_gameicon(url, color):
    req = urllib.request.urlopen(url)
    svg = req.read().decode('utf-8')
    # Remove the black background square
    svg = re.sub(r'<path d="M0 0h512v512H0z"/?>', '', svg)
    # Replace fill with the specified vibrant color
    svg = re.sub(r'fill="[^"]*"', f'fill="{color}"', svg)
    if 'fill="' not in svg:
        svg = svg.replace('<path ', f'<path fill="{color}" ')
    return svg

# 1. Chicken Feather (Lorc feather in vibrant amber gold)
feather_svg = process_gameicon('https://raw.githubusercontent.com/game-icons/icons/master/lorc/feather.svg', '#fbbf24')
with open(r'd:\Dev\SOTCraft\public\resource\chicken-feather.svg', 'w', encoding='utf-8') as f:
    f.write(feather_svg)
print('Updated chicken-feather.svg')

# 2. Metal Scrap (Lorc gears in metallic orange)
gears_svg = process_gameicon('https://raw.githubusercontent.com/game-icons/icons/master/lorc/gears.svg', '#fb923c')
with open(r'd:\Dev\SOTCraft\public\resource\metal-scrap.svg', 'w', encoding='utf-8') as f:
    f.write(gears_svg)
print('Updated metal-scrap.svg')

# 3. Rubber (Delapouite car-wheel in slate silver)
wheel_svg = process_gameicon('https://raw.githubusercontent.com/game-icons/icons/master/delapouite/car-wheel.svg', '#94a3b8')
with open(r'd:\Dev\SOTCraft\public\resource\rubber.svg', 'w', encoding='utf-8') as f:
    f.write(wheel_svg)
print('Updated rubber.svg')

# 4. Sulfur (Lorc crystal-cluster in glowing yellow)
crystal_svg = process_gameicon('https://raw.githubusercontent.com/game-icons/icons/master/lorc/crystal-cluster.svg', '#fde047')
with open(r'd:\Dev\SOTCraft\public\resource\sulfur.svg', 'w', encoding='utf-8') as f:
    f.write(crystal_svg)
print('Updated sulfur.svg')

# 5. Aluminium (Silver ingot in clean metallic cyan/silver)
with open(r'd:\Dev\SOTCraft\public\resource\silver.svg', 'r', encoding='utf-8') as f:
    silver_svg = f.read()
alum_svg = re.sub(r'fill="[^"]*"', 'fill="#93c5fd"', silver_svg)
with open(r'd:\Dev\SOTCraft\public\resource\aluminium.svg', 'w', encoding='utf-8') as f:
    f.write(alum_svg)
print('Updated aluminium.svg')
