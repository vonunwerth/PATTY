import unittest
import json
import wave
from pathlib import Path
from app import app


class AppTest(unittest.TestCase):
    def test_local_english_audio(self):
        root = Path(__file__).resolve().parents[1] / 'static'
        source = (root / 'speech-assets.js').read_text(encoding='utf-8-sig')
        manifest = json.loads(source.removeprefix('export default ').strip().removesuffix(';'))
        self.assertEqual(len(manifest), 115)
        for number in range(1, 101):
            self.assertIn(f'One minute. P {number}.', manifest)
        for path in manifest.values():
            with wave.open(str(root / path), 'rb') as clip:
                self.assertGreater(clip.getnframes(), 1000)
        with app.test_client() as client:
            with client.get('/static/audio/call-0.wav') as response:
                self.assertEqual(response.status_code, 200)
                self.assertEqual(response.data[:4], b'RIFF')

    def test_page_and_assets(self):
        with app.test_client() as client:
            page = client.get('/')
            self.assertEqual(page.status_code, 200)
            self.assertIn(b'PARABEL', page.data)
            for asset in ('app.js', 'timeline.js', 'style.css'):
                with client.get('/static/' + asset) as response:
                    self.assertEqual(response.status_code, 200)


if __name__ == '__main__':
    unittest.main()
