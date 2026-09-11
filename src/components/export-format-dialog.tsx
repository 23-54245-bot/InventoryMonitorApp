import { Button, Dialog, Portal, Text } from "react-native-paper";

// react-native-web's Alert.alert() is a no-op, so format prompts must use a real dialog to work on web too.
type ExportFormatDialogProps = {
  visible: boolean;
  title: string;
  onDismiss: () => void;
  onSelectExcel: () => void;
  onSelectWord: () => void;
};

export function ExportFormatDialog({ visible, title, onDismiss, onSelectExcel, onSelectWord }: ExportFormatDialogProps) {
  return (
    <Portal>
      {/* The app's global theme roundness (18) is multiplied by 7 for Dialog by default, making it pill-shaped; override it here. */}
      <Dialog visible={visible} onDismiss={onDismiss} style={{ borderRadius: 24 }}>
        <Dialog.Title>{title}</Dialog.Title>
        <Dialog.Content>
          <Text>Choose a file format to save.</Text>
        </Dialog.Content>
        <Dialog.Actions>
          <Button
            onPress={() => {
              onDismiss();
              onSelectExcel();
            }}
          >
            Excel (.csv)
          </Button>
          <Button
            onPress={() => {
              onDismiss();
              onSelectWord();
            }}
          >
            Word (.doc)
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}
