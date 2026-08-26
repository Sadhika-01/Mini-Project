import os
import uuid
from abc import ABC, abstractmethod
from typing import Optional

# Base directory for local file uploads
UPLOAD_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "uploads"))

class BaseStorageService(ABC):
    """Abstract Base Class for File Storage Services (Pluggable for S3/Cloud)."""

    @abstractmethod
    def save_file(self, file_bytes: bytes, filename: str, subfolder: str = "general") -> str:
        """Save file bytes and return storage location path/key."""
        pass

    @abstractmethod
    def get_file_path(self, storage_location: str) -> Optional[str]:
        """Resolve storage location key to an absolute filepath or downloadable reference."""
        pass

    @abstractmethod
    def delete_file(self, storage_location: str) -> bool:
        """Delete file from storage location."""
        pass

class LocalStorageService(BaseStorageService):
    """Local Disk Storage Implementation."""

    def __init__(self, base_dir: str = UPLOAD_DIR):
        self.base_dir = base_dir
        os.makedirs(self.base_dir, exist_ok=True)

    def save_file(self, file_bytes: bytes, filename: str, subfolder: str = "general") -> str:
        target_dir = os.path.join(self.base_dir, subfolder)
        os.makedirs(target_dir, exist_ok=True)

        # Generate unique filename to prevent collisions
        ext = os.path.splitext(filename)[1]
        unique_name = f"{uuid.uuid4().hex}{ext}"
        filepath = os.path.join(target_dir, unique_name)

        with open(filepath, "wb") as f:
            f.write(file_bytes)

        # Store relative storage location
        relative_path = os.path.join(subfolder, unique_name)
        return relative_path

    def get_file_path(self, storage_location: str) -> Optional[str]:
        full_path = os.path.join(self.base_dir, storage_location)
        if os.path.exists(full_path):
            return full_path
        return None

    def delete_file(self, storage_location: str) -> bool:
        full_path = os.path.join(self.base_dir, storage_location)
        if os.path.exists(full_path):
            os.remove(full_path)
            return True
        return False

# Global storage service instance (Can be swapped with S3StorageService in config)
storage_service = LocalStorageService()
