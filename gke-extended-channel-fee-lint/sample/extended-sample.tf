variable "gke_version" {
  default = "1.32.4-gke.1106006"
}

data "google_container_engine_versions" "ledger" {
  location       = "europe-west1"
  version_prefix = "1.33."
}

resource "google_container_cluster" "payments" {
  name               = "payments-prod"
  location           = "us-central1"
  min_master_version = var.gke_version
  release_channel {
    channel = "EXTENDED"
  }
}

resource "google_container_cluster" "search" {
  name               = "search-prod"
  location           = "us-east1"
  min_master_version = "1.31.7-gke.1265000"
  release_channel {
    channel = "EXTENDED"
  }
}

resource "google_container_cluster" "ledger" {
  name               = "ledger-prod"
  location           = "europe-west1"
  min_master_version = data.google_container_engine_versions.ledger.latest_master_version
  release_channel {
    channel = "EXTENDED"
  }
  maintenance_policy {
    recurring_window {
      start_time = "2026-01-01T02:00:00Z"
      end_time   = "2026-01-01T06:00:00Z"
      recurrence = "FREQ=WEEKLY;BYDAY=SA"
    }
    maintenance_exclusion {
      exclusion_name = "freeze-for-audit"
      start_time     = "2027-05-01T00:00:00Z"
      end_time       = "2027-09-01T00:00:00Z"
      exclusion_options {
        scope = "NO_MINOR_UPGRADES"
      }
    }
  }
}

resource "google_container_cluster" "analytics" {
  name               = "analytics"
  location           = "us-central1"
  min_master_version = "1.30.12-gke.1086000"
  release_channel {
    channel = "REGULAR"
  }
}

resource "google_container_cluster" "batch" {
  name               = "batch"
  location           = "us-west1"
  min_master_version = "1.34.1-gke.1829001"
  release_channel {
    channel = "UNSPECIFIED"
  }
}

resource "google_container_cluster" "edge" {
  name             = "edge"
  location         = "us-central1"
  enable_autopilot = true
  release_channel {
    channel = "EXTENDED"
  }
}

resource "google_container_cluster" "ml" {
  name               = "ml-training"
  location           = "us-central1"
  min_master_version = "1.34.1-gke.1829001"
  release_channel {
    channel = "EXTENDED"
  }
  enable_k8s_beta_apis {
    enabled_apis = ["resource.k8s.io/v1beta1/deviceclasses"]
  }
}

resource "google_container_cluster" "tools" {
  name                    = "platform-tools"
  location                = "us-central1"
  enable_kubernetes_alpha = true
  release_channel {
    channel = "EXTENDED"
  }
  addons_config {
    config_connector_config {
      enabled = true
    }
  }
}

resource "google_container_node_pool" "legacy" {
  name    = "legacy-pool"
  cluster = google_container_cluster.search.id
  version = "1.31.7-gke.1265000"
}

resource "google_container_node_pool" "win" {
  name    = "windows-pool"
  cluster = google_container_cluster.payments.id
  node_config {
    image_type = "WINDOWS_LTSC_CONTAINERD"
  }
}
