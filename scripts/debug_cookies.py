"""Debug cookie extraction - check what's in the DB."""
import os, sqlite3, tempfile, ctypes, ctypes.wintypes

kernel32 = ctypes.windll.kernel32

class DATA_BLOB(ctypes.Structure):
    _fields_ = [('cbData', ctypes.wintypes.DWORD), ('pbData', ctypes.POINTER(ctypes.c_char))]

def read_locked_file(filepath):
    handle = kernel32.CreateFileW(filepath, 0x80000000, 0x01 | 0x02 | 0x04, None, 3, 0x80, None)
    if handle == -1:
        raise ctypes.WinError(ctypes.get_last_error())
    try:
        high = ctypes.wintypes.DWORD(0)
        low = kernel32.GetFileSize(handle, ctypes.byref(high))
        file_size = (high.value << 32) | low
        buf = ctypes.create_string_buffer(file_size)
        bytes_read = ctypes.wintypes.DWORD(0)
        kernel32.ReadFile(handle, buf, file_size, ctypes.byref(bytes_read), None)
        return buf.raw[:bytes_read.value]
    finally:
        kernel32.CloseHandle(handle)

edge_db = os.path.expanduser('~') + r'\AppData\Local\Microsoft\Edge\User Data\Default\Network\Cookies'
data = read_locked_file(edge_db)

tmp = os.path.join(tempfile.gettempdir(), 'debug_cookies.db')
with open(tmp, 'wb') as f:
    f.write(data)

conn = sqlite3.connect(f'file:{tmp}?mode=ro', uri=True)
cur = conn.cursor()

cur.execute("""
    SELECT name, length(value), length(encrypted_value), host_key
    FROM cookies
    WHERE host_key LIKE '%youtube%'
    LIMIT 10
""")
print("YouTube cookies analysis:")
print(f"{'name':<30} {'value_len':>10} {'enc_len':>10} {'host'}")
print("-" * 80)
for name, vlen, elen, host in cur.fetchall():
    print(f"{name:<30} {vlen:>10} {elen:>10} {host}")

# Check if any have non-empty value
cur.execute("SELECT count(*) FROM cookies WHERE host_key LIKE '%youtube%' AND value != ''")
plain_count = cur.fetchone()[0]
cur.execute("SELECT count(*) FROM cookies WHERE host_key LIKE '%youtube%' AND encrypted_value != ''")
enc_count = cur.fetchone()[0]
print(f"\nYouTube cookies with plain value: {plain_count}")
print(f"YouTube cookies with encrypted value: {enc_count}")

# Try to decrypt one
cur.execute("SELECT name, encrypted_value FROM cookies WHERE host_key LIKE '%youtube%' AND encrypted_value != '' LIMIT 1")
row = cur.fetchone()
if row:
    name, enc = row
    print(f"\nTrying to decrypt '{name}' ({len(enc)} bytes)")
    print(f"First 20 bytes: {enc[:20].hex()}")
    
    # Check prefix - modern Edge uses different encryption
    if enc[:3] == b'v10' or enc[:3] == b'v20':
        print("Uses v10/v20 encryption (App Bound Encryption) - needs browser key")
        print("This requires the browser's encryption key, not just DPAPI")
    else:
        # Try DPAPI
        blob_in = DATA_BLOB(len(enc), ctypes.create_string_buffer(enc, len(enc)))
        blob_out = DATA_BLOB()
        if ctypes.windll.crypt32.CryptUnprotectData(ctypes.byref(blob_in), None, None, None, None, 0, ctypes.byref(blob_out)):
            result = ctypes.string_at(blob_out.pbData, blob_out.cbData)
            print(f"DPAPI decrypted: {result[:50]}")
            kernel32.LocalFree(blob_out.pbData)
        else:
            print(f"DPAPI failed: {ctypes.get_last_error()}")

conn.close()
os.remove(tmp)
