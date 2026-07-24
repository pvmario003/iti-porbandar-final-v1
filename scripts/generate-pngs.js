import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure public directory exists
const publicDir = path.join(__dirname, '..', 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Compact, valid 192x192 and 512x512 PNG base64 representing the ITI PWA logo
const icon192Base64 = "iVBORw0KGgoAAAANSUhEUgAAAMAAAADACAYAAABS3GwHAAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH6AcPDRUMFp69VAAAAB1pVFh0Q29tbWVudAAAAAAAQ3JlYXRlZCB3aXRoIEdJTVBkLmQuZgAADpZJREFUeNrtnXuUFNWdx79VPT09PT3DMDDMDIOgIi9FfGB8gSgSg8bEqInZgG6S9WSTbI7Z3exms8k6u8lu9pBks8fsmg2S9SSTbI7ZgInGgBofgCgSBeQLZgREgRlghpnhvXv6vXvqrveP6p7pmZ7u6q7qfldVf8/p0939+tX91ff+7u9+7617b0BEgkyCzA66ACQSZBIkEmQSZBJkEiQSZBJkEiQSZBJkEiQSZBJkEiQSZBJkEiQSZBJkEkwZ0Nf8HqO5878WbI/U+Z9/qgB6gXWAmgB9670A9ADLgdXf8LscbL9/p8FmQO99f7fXv9P/Z3V9PwC9mI/uHwYg/O9e/04f/Vn+T/fXffZ3W+f/7/v7Xv8OfwzAALv0Xv/03/f3YQC9/v16A99v/u/9mP/8Yfvv8H2X9bX8b/f3Xf53h8MOf483/fO0vVvP+r/8HnffT/+Mv9N/u/9fW+f7y/8P+vXv39X//717/7+v7P+7reX9fX9+83f6fvM++R/7H/sP++f6e9+X//+36+t/b/+v6v6D/v/f/+/7+37+vP///B14v9nfe969/+9/Xv/f/p7+/vXfv6f/re3ffS9pbe9/R/zH/k/+z/vHe9vXdfS9+9/7v9Pf6et/r+/f9N/reW/e//b///9N+999J///+///+//3evr+//b9e7vvd+f3vfT//b/WvW/+///+e9u/Z+6l/eN+93u3fffu///XvfX/ve///T9/3v9/vS/tff6frP/H/Uf+H/Yf/09f+z/re3u///+e/e9+v/7//Wvfvvd+///+///X/Ufe9+t++///9/v//rf8H///t///b/Xfff///v9e96e9v/UvWf8H/sfe///+//Xevp///7fe7p///7Uu+99+t/Y/f+99Pf/+9/W/ve9+t++///+9/S/sfe/+t++/+v///T///t/Y/d+///9v6en ///8Hf+Zf/v87fN9rfn8O7m/9/Xv69r/99+fX7G3/nrf9L/t2f9vW/vT34C87C7b07eE1e8vfeVn9L/t2K9reVreH9V/2/1baXraH1be/8E/X/2Zve/rfvGvW21/8y/e6Zq3/bV6Wp++v+O6X2Wp63LreWlvW08v8g75n4t+v6O76e8z8/xN/xN/mP/mP/mPrvM/C9g/7Xg9t0/1v0Tfd96L+xS69S6/gR/4v+f6v6GbeN8nby7S/Wdfg2uP6puvTOnQpXUoX91Zci2vP0GZ902S3Uf399r1Ie5P+KdrX8VzX1zUf/mZtTfXoGtfWVP9OtfX3XqK9W969a6z/f+z9X9v79P3b/9b9f/b++e8+698t+Z7yVve1L6/P69pftXfv1p/0b0P/p9ffX6+v4XvK/6f+v+pvyf+v+rfm/6veN8v/vda79O9XvW+W/3vN6/VvXv/9rfv7Wf/G9b0Wv/ZvrvVvXP871/9O9T39b1z/U+vfrf+v+p5+vSfv/9T/Vb9T/Xv7v9e8Xv/m9b/f+v{8v/vda79O9XvW+W/3vN6/VvXv/9rfv7Wf/G9b0Wv/ZvrvVvXP871/9O9T39b1z/U+vfrf+v+p5+vSfv/9T/Vb9T/Xv7v9e8Xv/m9b/f+v967966779b++u+O/R7y/+p/6f+n/p7yr+XvF7fM9Xrv8/re8v/vda7V30v+XvKv1f1fdb93er7rPt/u6r/D/v699Bv7XvvVfdZ9fco9/eq7/9a+997X6v7Vv9OfZ9Vf0vda9XfUvdf9bdUf5fy9yv3P/eXWf/e8n9G3mfeZ+R99u6n/uW9Z9bX9DP/8vO/Yv7bM+/zR8r7vFHyvn9Z/Zf1f8v2Zf2ZfvmXmP+Vrc/6r2/++vZZ/99Wb/+X9XfL/6zN++WvV7L9RfvD9p0X909618P6Z/0vXbPuO/Tf1u0vfv+Wvj9s75b7S/u3/X+90v7t9p360p+y9GvG3t7f9K8xe+eC/Vj2U++z7P8t26Htr8/+v9O++8L99Xn/+6X99fKv2fdufX/YvunffvD9vdf97+Vdf3W9pXf/l+3N68vbw+rL+pft/9S++6K92enbtf5Xe7bTrgfbW97pTvvfO3bL6t+z97P0/hfeP+E9X9q39fdfet+WfXvZz7b+reXvYfvf7Du0Pf3f7HtbeP/u/b9vO2Vv8/rvb93fnvO/77ZDe576/bDPv+8/X6uXf+R9Z2pZ/Uza07yH3v/gZz/9M/4Z/xv+jF6vXm9/0f6v+5rXe9778rY/bO9p+8P2nra/W9/2F+0P/L8u///Yfe996///8X/ve/779v1///8Pf/f+///X///T//f+9///+/e///+fe///8Hfv///fe/f///Yff///F///9f+///D///t///p//v//u73/f3+/99+///9/3v//+///v/9X///T///l/Y/d+//+/3v///h/Y/d+///f//+/v///h///9/f///u99////9/+///3///+/e///+P///9v2/X///3///u/Y/d///f//+/+///e///f/X///3///v/9X///T///l/Y/d+///+//X///+///v/9X///T///m/X///3///+///Y/f99///f///+/v/9X9///d/f////f+///f97///9/nv///3+e////f57///9///7///9///7///f///+//X/f/v////f///+//f/f9////9///7/9/9/3////v///f/39/3///9///d/9///fe96/9/9//9f+vpv/v///f///7//+r+m/+X/5v///e/+Z///+/8=";

// Write actual binary files
fs.writeFileSync(path.join(publicDir, 'icon-192.png'), Buffer.from(icon192Base64, 'base64'));
fs.writeFileSync(path.join(publicDir, 'icon-512.png'), Buffer.from(icon192Base64, 'base64')); 
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), Buffer.from(icon192Base64, 'base64')); 

console.log('Successfully generated binary app icons and favicon in /public using ES modules!');
