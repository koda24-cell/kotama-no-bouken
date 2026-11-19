# Shared CPU-only Blender + ClamAV environment for all Kotama 3D asset jobs.
# Built once and published to GHCR. Definitions MUST be refreshed per workflow run.
FROM ubuntu:24.04
ARG DEBIAN_FRONTEND=noninteractive
LABEL org.opencontainers.image.source="https://github.com/koda24-cell/kotama-no-bouken"
LABEL org.opencontainers.image.description="Shared Blender and ClamAV runtime for unapproved Kotama 3D asset QA"
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       blender clamav clamav-freshclam python3 python3-numpy python3-pil ca-certificates bash coreutils grep findutils git libegl1 libgl1 \
    && sed -i -E '/^[[:space:]]*NotifyClamd[[:space:]]/d' /etc/clamav/freshclam.conf \
    && rm -rf /var/lib/apt/lists/* \
    && mkdir -p /work /var/lib/clamav /tmp/blender-home \
    && chown clamav:clamav /var/lib/clamav \
    && chmod 1777 /tmp/blender-home
WORKDIR /work
CMD ["/bin/bash"]
