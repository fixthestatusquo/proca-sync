## Setup

- In your `.env`, set:
  - `CRM=ohme`
  - `CRM_API_URL=https://api-ohme.oneheart.fr/api/v1` (or your instance URL)
  - `CRM_API_USERNAME=` your Ohme client name
  - `CRM_API_TOKEN=` your Ohme client secret

## Contact workflow

When a supporter signs a petition, the following happens:

### 1. Upsert contact

`POST /contacts` with the contact payload.

- If the contact is **new** (201): Ohme creates it and returns the contact object.
- If the contact **already exists** (non-2xx): the code falls back to `GET /contacts?email=...` to retrieve the existing contact, then `PUT /contacts/{id}` to update their fields.

Fields always written to the contact:

| Ohme field  | Source                        |
|-------------|-------------------------------|
| `email`     | `contact.email`               |
| `firstname` | `contact.firstName`           |
| `lastname`  | `contact.lastName`            |
| `language`  | `actionPage.locale`           |

Additional fields are mapped via `CONTACT_EXTRA_FIELDS` (see below).

### 2. Set source (new contacts only)

If `CRM_SOURCE` is set, `PUT /contacts/{id}` is called with `{ [CRM_SOURCE]: campaign.name }`. This is skipped for existing contacts.

### 3. Create interaction

`POST /interactions` with:

| Ohme field                    | Source / default                                    |
|-------------------------------|-----------------------------------------------------|
| `date`                        | `action.createdAt` (date part only)                 |
| `interaction_type_name`       | env `OHME_INTERACTION_TYPE` or `Signature de Pétition` |
| `interaction_category_name`   | env `OHME_INTERACTION_CATEGORY` or `Pétition`       |
| `interaction_label_name`      | `campaign.name`                                     |
| `contact.id`                  | Ohme contact ID from step 1                         |

Additional fields are mapped via `INTERACTION_EXTRA_FIELDS` (see below).

## Which actions are processed

Controlled by `CRM_TYPE` (default: `OPTIN`):

| `CRM_TYPE`       | Processes                                                   |
|------------------|-------------------------------------------------------------|
| `OPTIN`          | Only actions where `privacy.optIn === true` (default)       |
| `DOUBLE_OPTIN`   | Only actions where `privacy.emailStatus === "double_opt_in"`|
| `CONTACT`        | All actions where `privacy.withConsent === true`            |
| `ACTION_CONTACT` | All actions (you must override `handleActionContact`)       |

## Field mapping via env vars

Both `CONTACT_EXTRA_FIELDS` and `INTERACTION_EXTRA_FIELDS` use URL query string format: `ohmeField=dot.path&ohmeField2=dot.path2`.

The dot path is resolved against `{ message, camp }`:
- `message` — the full action message (`message.contact.email`, `message.campaign.name`, `message.privacy.optIn`, `message.tracking.medium`, …)
- `camp` — the Proca campaign object fetched from the API (`camp.config.component.sync.category`, …)

Example (`CONTACT_EXTRA_FIELDS`):
```
petitionnaire=message.campaign.name&centre_interet=camp.config.component.sync.category&opt_in=message.privacy.optIn
```

Example (`INTERACTION_EXTRA_FIELDS`):
```
utm_medium1=message.tracking.medium&utm_source1=message.tracking.source&utm_campaign1=message.tracking.campaign
```

## Rate limiting

Defaults to 80 requests/minute. Override with `OHME_RATE_LIMIT=N`. On a 429 response, all requests pause for 15 seconds automatically.
