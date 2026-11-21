---
category: prompts
---
Create a certificate signing request for the existing private key `/home/agent/work/site.key` by running

```
openssl req -new -key /home/agent/work/site.key -out /home/agent/work/site.csr
```

and answering its interactive prompts with:

- Country Name: `IN`
- State or Province Name: `Karnataka`
- Locality Name: `Bengaluru`
- Organization Name: `Example Widgets Ltd`
- Organizational Unit Name: `Platform`
- Common Name: `widgets.example.com`
- Email Address: `admin@widgets.example.com`

Leave the challenge password and the optional company name empty.
