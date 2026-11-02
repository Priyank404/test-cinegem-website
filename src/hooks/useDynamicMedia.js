// Backward-compatibility wrapper delegating directly to useDriveMedia
import { useDriveMedia } from "./useDriveMedia";

export function useDynamicMedia(folderIdentifier = "Creative visuals") {
  const media = useDriveMedia(folderIdentifier);
  return {
    ...media,
    source: "drive",
    setSource: () => {},
    folderKey: folderIdentifier,
    setFolderKey: () => {},
    availableDriveFolders: [],
    availableLocalFolders: [],
  };
}

export default useDynamicMedia;
