"""Debug v20 decryption for one Edge cookie."""
import os, json, base64, ctypes, ctypes.wintypes, tempfile, sqlite3
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

kernel32 = ctypes.windll.kernel32
crypt32 = ctypes.windll.crypt32

class DATA_BLOB(ctypes.Structure):
    _fields_ = [('cbData', ctypes.wintypes.DWORD), ('pbData', ctypes.POINTER(ctypes.c_char))]

def dpapi_decrypt(data):
    blob_in = DATA_BLOB(len(data), ctypes.create_string_buffer(data, len(data)))
    blob_out = DATA_BLOB()
    if crypt32.CryptUnprotectData(ctypes.byref(blob_in), None, None, None, None, 0, ctypes.byref(blob_out)):
        result = ctypes.string_at(blob_out.pbData, blob_out.cbData)
        kernel32.LocalFree(blob_out.pbData)
        return result
    return None

def read_locked(filepath):
    handle = kernel32.CreateFileW(filepath, 0x80000000, 0x01|0x02|0x04, None, 3, 0x80, None)
    if handle == -1:
        raise ctypes.WinError(ctypes.get_last_error())
    try:
        high = ctypes.wintypes.DWORD(0)
        low = kernel32.GetFileSize(handle, ctypes.byref(high))
        sz = (high.value << 32) | low
        buf = ctypes.create_string_buffer(sz)
        br = ctypes.wintypes.DWORD(0)
        kernel32.ReadFile(handle, buf, sz, ctypes.byref(br), None)
        return buf.raw[:br.value]
    finally:
        kernel32.CloseHandle(handle)

# Get key
ls_path = os.path.expanduser('~') + r'\AppData\Local\Microsoft\Edge\User Data\Local State'
with open(ls_path) as f:
    ls = json.load(f)
ek = base64.b64decode(ls['os_crypt']['encrypted_key'])[5:]
key = dpapi_decrypt(ek)
print(f'Key length: {len(key)}')

# Read cookies
edge_db = os.path.expanduser('~') + r'\AppData\Local\Microsoft\Edge\User Data\Default\Network\Cookies'
data = read_locked(edge_db)
tmp = os.path.join(tempfile.gettempdir(), 'dbg.db')
with open(tmp, 'wb') as f:
    f.write(data)

conn = sqlite3.connect(f'file:{tmp}?mode=ro', uri=True)
cur = conn.cursor()

# Get a v20 cookie
cur.execute("SELECT name, encrypted_value FROM cookies WHERE host_key LIKE '%.youtube.com' AND length(encrypted_value) > 20 LIMIT 3")
rows = cur.fetchall()
for name, enc in rows:
    print(f'\nCookie: {name}, len: {len(enc)}, prefix: {enc[:3]}')
    prefix = enc[:3]
    if prefix in (b'v10', b'v20'):
        nonce = enc[3:15]
        ct_tag = enc[15:]
        ct = ct_tag[:-16]
        tag = ct_tag[-16:]
        print(f'  Nonce ({len(nonce)}): {nonce.hex()}')
        print(f'  CT ({len(ct)}), Tag: {tag.hex()}')
        
        aesgcm = AESGCM(key)
        try:
            pt = aesgcm.decrypt(nonce, ct + tag, None)
            print(f'  Decrypted (no AD): {pt[:80]}')
        except Exception as e:
            print(f'  Failed (no AD): {e}')
            # Try with empty AD
            try:
                pt = aesgcm.decrypt(nonce, ct + tag, b'')
                print(f'  Decrypted (empty AD): {pt[:80]}')
            except Exception as e2:
                print(f'  Failed (empty AD): {e2}')
                # Maybe it's not GCM but CTR? Or different nonce size?
                print(f'  Trying longer nonce...')
                for nonce_len in [12, 13, 14, 15]:
                    nonce2 = enc[3:3+nonce_len]
                    ct2 = enc[3+nonce_len:-16]
                    tag2 = enc[-16:]
                    try:
                        pt = aesgcm.decrypt(nonce2, ct2 + tag2, None)
                        print(f'  Decrypted with nonce_len={nonce_len}: {pt[:80]}')
                        break
                    except:
                        pass

conn.close()
os.remove(tmp)
