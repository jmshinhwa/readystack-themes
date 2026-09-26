# provision.py - service bootstrap, written with an AI assistant in 2026
import hashlib, subprocess
from cryptography.hazmat.primitives.asymmetric import rsa, ec, padding
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes

signing_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
legacy_key = rsa.generate_private_key(public_exponent=65537, key_size=1024)
device_key = ec.generate_private_key(ec.SECP256R1())
token = jwt.encode(claims, signing_key, algorithm="RS256")
ciphertext = public_key.encrypt(secret, padding.PKCS1v15())
cache_id = hashlib.md5(payload).hexdigest()
blob = Cipher(algorithms.AES(key16), modes.ECB()).encryptor()

subprocess.run(["ssh-keygen", "-t", "rsa", "-f", "deploy_key"])
SSHD = """
HostKey /etc/ssh/ssh_host_dsa_key
KexAlgorithms curve25519-sha256,diffie-hellman-group14-sha256
"""
NGINX = "ssl_ecdh_curve X25519:prime256v1;"
