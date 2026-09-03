# Not build-tested in the environment this was authored in (no Docker
# daemon available there) — see root README.md "Honesty note". Test
# `docker build .` yourself before relying on this in production.

FROM python:3.11-slim

WORKDIR /app

# System deps for the geospatial stack (rasterio/wradlib/netCDF4) referenced
# in requirements.txt. If you're only running the MVP (baseline models, no
# real raster ingestion), you can trim requirements.txt down to
# numpy/pandas/scipy/scikit-learn/pyyaml/fastapi/uvicorn/pydantic and drop
# this apt block — it exists for the full spec's dependency list, not
# because the MVP endpoints need it today.
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc g++ libgdal-dev libgeos-dev libproj-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV PYTHONPATH=/app/src
EXPOSE 8000

CMD ["uvicorn", "varshanetra.inference.api:app", "--host", "0.0.0.0", "--port", "8000"]
