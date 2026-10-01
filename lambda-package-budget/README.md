# Lambda Package Size Budget - 250 MB check

![Lambda Package Size Budget - 250 MB check — finds the line](https://getreadystack.com/img/promo/lambda-package-budget_demo.gif)

![Lambda Package Size Budget - 250 MB check](https://getreadystack.com/img/promo/sku439194_result_card.jpg)

**Which line in requirements.txt or package.json is eating your 250 MB?** This extension reads the dependency file you have open, looks up the measured unzipped size of every listed package, and compares the total with the AWS Lambda limit for .zip functions: 250 MB unzipped, **layers and custom runtimes included**, and 50 MB zipped for a direct upload through the Lambda API, SDKs or console. Container images get 10 GB.

Free web version, same engine: https://getreadystack.com/tools/lambda-package-budget

Yardstick: a developer hour at the BLS 2025 median wage for software developers is $65.38 (OEWS).

## Worked example (the bundled sample)

```
# invoice-ocr Lambda (python3.12, .zip deployment)
boto3==1.43.106          -> delete: the Lambda Python runtime already includes Boto3 (1.0 MB)
botocore==1.43.106       -> delete: 20.5 MB, 8.2% of the limit
numpy==2.5.3             -> 56.4 MB = 22.6% of the 250 MB limit
pandas==3.0.6            -> 38.9 MB = 15.6% of the 250 MB limit
opencv-python==5.0.0.93  -> opencv-python-headless==5.0.0.93 (150.3 MB), saves 39.2 MB
requests==2.34.2         -> 0.2 MB
```

Result: **306.5 MB unzipped, 56.5 MB over.** The flagged lines save 60.7 MB: **245.8 MB after the fixes, 4.2 MB under.** The wheels also download at 114.8 MB zipped, above the 50 MB direct-upload limit, so upload the .zip through Amazon S3.

## What it checks (47 rules)

- **Runtime-included SDKs.** The Python runtime includes the SDK for Python (Boto3); every supported Node.js runtime includes the AWS SDK for JavaScript v3. boto3, botocore, s3transfer and @aws-sdk/* lines are flagged, with the note that bundling only makes sense when you need a newer version than the runtime ships.
- **Lighter twins.** opencv-python -> opencv-python-headless; aws-sdk v2 (98.2 MB) -> @aws-sdk/client-<service> v3; googleapis (215.0 MB) -> the single @googleapis/<api> package; puppeteer -> puppeteer-core with @sparticuz/chromium (70.1 MB).
- **Container-only wheels.** torch 2.14.1 (1144.2 MB unzipped) and tensorflow 2.21.0 (1873.3 MB) are each over 250 MB alone: set PackageType: Image.
- **Build tools shipped by mistake.** aws-cdk-lib (137.1 MB), aws-cdk, typescript, jest, eslint, webpack, esbuild, prisma, ts-node, serverless and @types/* under "dependencies" -> move to "devDependencies".
- **Heavy packages** (10 MB or more) get their share of the limit, so you see what a layer would not save: layers count toward the same 250 MB.

## How the sizes were measured

On 2026-09-30, from the PyPI cp312 manylinux x86_64 wheel of each package (the sum of the file sizes in the wheel's zip directory) and from the npm registry's `dist.unpackedSize`. Sizes belong to the version shown in each finding; other versions differ.

**Limits:** it counts the lines you list. A hand-written requirements.txt leaves out transitive dependencies, so run it on `pip freeze` output for the full picture. Packages outside the size table are named in the finding and not counted, never guessed.

## Use

Open requirements.txt or package.json. Findings appear in the Problems panel. Command palette: *Lambda Package Size Budget - 250 MB check: Check this file*.

Free, no key: every line, the total, the zipped check and each fix. Next job, for teams: [dated size-budget report for the pull request and a CI gate with your own MB budget](https://getreadystack.com/api/buy/cl/polar_cl_RAeCn2bsWzjBNOsw2R8DHqrrFRj38wV88wgLP4Mj5f9), $29 once per licence key.

## Sources

- AWS Lambda quotas: https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-limits.html
- Python runtime (includes Boto3): https://docs.aws.amazon.com/lambda/latest/dg/lambda-python.html
- Node.js runtime (includes SDK v3): https://docs.aws.amazon.com/lambda/latest/dg/lambda-nodejs.html
- BLS OEWS software developers median, 2025: https://www.bls.gov/oes/
