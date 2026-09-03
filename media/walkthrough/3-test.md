## Check the connection

Run **OVHcloud AI Endpoints: Test connection and list models**.

- A list of model ids means the token works.
- `401` or `403`: the token is wrong or expired. Run **Set API token** again.
- `429`: rate limit reached, wait a minute.
- Network error: check `ovhAiEndpoints.baseUrl` in settings (default is the OVHcloud unified route).

Every request is logged in **View > Output > OVHcloud AI Endpoints**.
