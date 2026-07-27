from PIL import Image
import glob

for file in glob.glob(r'd:\Dev\SOTCraft\public\resource\*.png'):
    img = Image.open(file).convert('RGBA')
    data = img.getdata()
    newData = []
    for item in data:
        if item[3] > 0:
            newData.append((255, 255, 255, item[3]))
        else:
            newData.append((255, 255, 255, 0))
    img.putdata(newData)
    img.save(file)
    print(f"Converted {file}")
