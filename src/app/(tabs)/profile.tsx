import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Camera } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Avatar, Button, Card, Chip, Divider, IconButton, Text, TextInput, TouchableRipple, useTheme } from "react-native-paper";
import Animated, { FadeIn } from "react-native-reanimated";

import { ExportFormatDialog } from "../../components/export-format-dialog";
import { ProfileQrModal } from "../../components/profile/ProfileQrModal";
import { ProfileStoreModal } from "../../components/profile/ProfileStoreModal";
import { ShiftsSection } from "../../components/shifts/ShiftsSection";
import { ScreenContainer } from "../../components/screen-container";
import { useAuth, type Employee, type EmployeeStatus, type PendingInvite, type UserRole } from "../../context/auth";
import { useStore } from "../../context/store";
import { showAlert } from "../../lib/alert";
import { translate } from "../../lib/i18n";
import { downloadActivityLogExcel, downloadActivityLogWord, downloadInventoryExcel, downloadInventoryWord } from "../../lib/inventory-export";

const roleOptions: UserRole[] = ["Admin", "Manager", "Staff"];
const allProfileTabs = ["Account", "Store", "Team"] as const;

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function ProfileScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { session, employees, pendingInvites, addEmployee, updateEmployee, removeEmployee, refreshPendingInvites, resendInvite, revokeInvite, signOut } = useAuth();
  const { state, summary, updateUserProfile, updateStorePaymentQRs } = useStore();

  const language = state.user.preferences.language;
  const currentMonth = new Date().toISOString().slice(0, 7);
  const monthlyMovements = state.movements.filter((movement) => movement.timestamp.slice(0, 7) === currentMonth);
  const monthlyStockIns = monthlyMovements.filter((movement) => movement.type === "in").reduce((total, movement) => total + movement.quantity, 0);
  const monthlyStockOuts = monthlyMovements.filter((movement) => movement.type === "out").reduce((total, movement) => total + movement.quantity, 0);
  const monthlyExpiryAlerts = state.notifications.filter((notification) => notification.type === "expiry" && notification.createdAt.slice(0, 7) === currentMonth).length;

  const canManageStore = session?.role === "Admin" || session?.role === "Manager";
  const canManageTeam = session?.role === "Admin" || session?.role === "Manager";
  const profileTabs = allProfileTabs.filter((tab) => {
    if (tab === "Store") return canManageStore;
    if (tab === "Team") return canManageTeam;
    return true;
  });
  const [activeTab, setActiveTab] = useState<(typeof profileTabs)[number]>("Account");
  const [modal, setModal] = useState<"store" | null>(null);
  const [qrModal, setQrModal] = useState(false);
  const [exportDialog, setExportDialog] = useState<"inventory" | "activity" | null>(null);
  const [storeName, setStoreName] = useState(state.user.storeName);
  const [storeAddress, setStoreAddress] = useState(state.user.address ?? "");
  const [storePhone, setStorePhone] = useState(state.user.phone ?? "");
  const [storeEmail, setStoreEmail] = useState(state.user.storeEmail);
  const [businessHours, setBusinessHours] = useState(state.user.businessHours ?? "");
  const [permitNumber, setPermitNumber] = useState(state.user.permitNumber ?? state.user.storeId ?? "");
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(state.user.name);
  const [username, setUsername] = useState(state.user.username);
  const [phone, setPhone] = useState(state.user.phone ?? "");
  const [address, setAddress] = useState(state.user.address ?? "");
  const [avatarUri, setAvatarUri] = useState<string | undefined>(state.user.avatarUri);
  const [saving, setSaving] = useState(false);

  // QR Code setup state
  const [gcashName, setGcashName] = useState(state.user.storeQRs?.gcashName ?? "");
  const [gcashNumber, setGcashNumber] = useState(state.user.storeQRs?.gcashNumber ?? "");
  const [gcashQrUri, setGcashQrUri] = useState<string | undefined>(state.user.storeQRs?.gcashQrUri);
  const [mayaName, setMayaName] = useState(state.user.storeQRs?.mayaName ?? "");
  const [mayaNumber, setMayaNumber] = useState(state.user.storeQRs?.mayaNumber ?? "");
  const [mayaQrUri, setMayaQrUri] = useState<string | undefined>(state.user.storeQRs?.mayaQrUri);
  const [bankName, setBankName] = useState(state.user.storeQRs?.bankName ?? "");
  const [bankAccountName, setBankAccountName] = useState(state.user.storeQRs?.bankAccountName ?? "");
  const [bankAccountNumber, setBankAccountNumber] = useState(state.user.storeQRs?.bankAccountNumber ?? "");
  const [bankQrUri, setBankQrUri] = useState<string | undefined>(state.user.storeQRs?.bankQrUri);
  const [savingQRs, setSavingQRs] = useState(false);

  const [managerMode, setManagerMode] = useState<"add" | "edit" | null>(null);
  const [employeeForm, setEmployeeForm] = useState({ id: "", name: "", email: "", role: "Staff" as UserRole, status: "Active" as EmployeeStatus });
  const [employeeMessage, setEmployeeMessage] = useState<string | null>(null);
  const [keyboardOffset, setKeyboardOffset] = useState(0);

  const openProfileEdit = () => {
    setName(state.user.name);
    setUsername(state.user.username);
    setPhone(state.user.phone ?? "");
    setAddress(state.user.address ?? "");
    setAvatarUri(state.user.avatarUri);
    setEditing((current) => !current);
  };

  const openStoreModal = () => {
    if (!canManageStore) {
      showAlert(translate(language, "permissionDeniedTitle"), translate(language, "staffEditLimitDenied"));
      return;
    }
    setStoreName(state.user.storeName);
    setStoreAddress(state.user.address ?? "");
    setStorePhone(state.user.phone ?? "");
    setStoreEmail(state.user.storeEmail);
    setBusinessHours(state.user.businessHours ?? "");
    setPermitNumber(state.user.permitNumber ?? state.user.storeId ?? "");
    setModal("store");
  };

  const openQrModal = () => {
    if (!canManageStore) {
      showAlert(translate(language, "permissionDeniedTitle"), translate(language, "staffEditLimitDenied"));
      return;
    }
    setGcashName(state.user.storeQRs?.gcashName ?? "");
    setGcashNumber(state.user.storeQRs?.gcashNumber ?? "");
    setGcashQrUri(state.user.storeQRs?.gcashQrUri);
    setMayaName(state.user.storeQRs?.mayaName ?? "");
    setMayaNumber(state.user.storeQRs?.mayaNumber ?? "");
    setMayaQrUri(state.user.storeQRs?.mayaQrUri);
    setBankName(state.user.storeQRs?.bankName ?? "");
    setBankAccountName(state.user.storeQRs?.bankAccountName ?? "");
    setBankAccountNumber(state.user.storeQRs?.bankAccountNumber ?? "");
    setBankQrUri(state.user.storeQRs?.bankQrUri);
    setQrModal(true);
  };

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSubscription = Keyboard.addListener(showEvent, (event) => setKeyboardOffset(event.endCoordinates?.height ?? 0));
    const hideSubscription = Keyboard.addListener(hideEvent, () => setKeyboardOffset(0));
    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const isAdmin = session?.role === "Admin";
  const canViewTeam = canManageTeam;

  const handleLogout = async () => {
    const result = await signOut();
    if (!result.success) {
      showAlert(translate(language, "syncErrorTitle"), result.message);
      return;
    }
    router.replace("/login");
  };

  if (!session) return null;

  const handlePickAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"] as any,
      quality: 0.7,
      allowsEditing: true,
      aspect: [1, 1],
    });

    if (!result.canceled && result.assets[0]?.uri) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  const handleTakeAvatarPhoto = async () => {
    const permission = await Camera.requestCameraPermissionsAsync();
    if (!permission.granted) {
      showAlert(translate(language, "cameraAccessNeededTitle"), translate(language, "cameraAccessNeededMsg"));
      return;
    }

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"] as any,
        quality: 0.7,
        allowsEditing: true,
        aspect: [1, 1],
      });

      if (!result.canceled && result.assets[0]?.uri) {
        setAvatarUri(result.assets[0].uri);
      }
    } catch {
      showAlert(translate(language, "cameraUnavailableTitle"), translate(language, "cameraUnavailableMsg"));
    }
  };

  const handleSaveProfile = () => {
    setSaving(true);
    updateUserProfile({
      name: name.trim() || state.user.name,
      username: username.trim() || state.user.username,
      phone: phone.trim(),
      address: address.trim(),
      avatarUri,
      avatarInitials: getInitials(name || state.user.name),
    });
    setSaving(false);
    setEditing(false);
  };

  const openEmployeeEditor = (employee?: Employee) => {
    if (!employee) {
      setEmployeeForm({ id: "", name: "", email: "", role: "Staff", status: "Active" });
      setManagerMode("add");
      return;
    }

    setEmployeeForm({
      id: employee.id,
      name: employee.name,
      email: employee.email,
      role: employee.role,
      status: employee.status,
    });
    setManagerMode("edit");
  };

  const resetEmployeeEditor = () => {
    setManagerMode(null);
    setEmployeeForm({ id: "", name: "", email: "", role: "Staff", status: "Active" });
  };

  const handleSaveEmployee = async () => {
    if (!canManageTeam) return;

    if (!employeeForm.name.trim() || !employeeForm.email.trim()) {
      setEmployeeMessage(translate(language, "employeeFormValidation"));
      return;
    }

    const payload = {
      name: employeeForm.name.trim(),
      email: employeeForm.email.trim(),
      role: employeeForm.role,
    };

    const result = managerMode === "edit" && employeeForm.id
      ? await updateEmployee(employeeForm.id, { ...payload, status: employeeForm.status })
      : await addEmployee(payload);

    if (!result.success) {
      setEmployeeMessage(result.message);
      return;
    }

    setEmployeeMessage(result.message);
    resetEmployeeEditor();
  };

  const handleRemoveEmployee = async (employeeId: string) => {
    if (!canManageTeam) return;
    const result = await removeEmployee(employeeId);
    setEmployeeMessage(result.message);
  };

  const handleResendInvite = async (invite: PendingInvite) => {
    try {
      const result = await resendInvite(invite.email);
      setEmployeeMessage(result.message);
    } catch (error) {
      setEmployeeMessage(error instanceof Error ? error.message : String(error));
    }
  };

  const handleRevokeInvite = (invite: PendingInvite) => {
    const confirmRevoke = async () => {
      const result = await revokeInvite(invite.id);
      setEmployeeMessage(result.message);
    };

    if (Platform.OS === "web") {
      if (window.confirm(`Revoke the invitation for ${invite.email}?`)) void confirmRevoke();
      return;
    }

    Alert.alert(
      "Revoke invitation?",
      `The pending invitation for ${invite.email} will be removed.`,
      [
        { text: translate(language, "cancelButton"), style: "cancel" },
        { text: "Revoke", style: "destructive", onPress: () => void confirmRevoke() },
      ],
    );
  };

  const toggleEmployeeStatus = async (employee: Employee) => {
    if (!canManageTeam) return;
    const nextStatus: EmployeeStatus = employee.status === "Active" ? "Inactive" : "Active";
    const result = await updateEmployee(employee.id, { status: nextStatus });
    setEmployeeMessage(result.message);
  };

  const saveStoreInformation = () => {
    if (!canManageStore) {
      showAlert(translate(language, "permissionDeniedTitle"), translate(language, "staffEditLimitDenied"));
      return;
    }
    const nextStoreName = storeName.trim() || state.user.storeName;
    const nextAddress = storeAddress.trim() || state.user.address;
    const nextPhone = storePhone.trim() || state.user.phone;
    const nextStoreEmail = storeEmail.trim() || state.user.storeEmail;
    const nextBusinessHours = businessHours.trim() || state.user.businessHours;
    const nextPermitNumber = permitNumber.trim() || state.user.permitNumber;
    setStoreName(nextStoreName);
    setStoreAddress(nextAddress ?? "");
    setStorePhone(nextPhone ?? "");
    setStoreEmail(nextStoreEmail);
    setBusinessHours(nextBusinessHours ?? "");
    setPermitNumber(nextPermitNumber ?? "");
    updateUserProfile({ storeName: nextStoreName, storeEmail: nextStoreEmail, address: nextAddress, phone: nextPhone, businessHours: nextBusinessHours, permitNumber: nextPermitNumber });
    setModal(null);
  };

  const handlePickGCashQR = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"] as any,
      allowsEditing: true,
      quality: 1,
    });
    if (!res.canceled && res.assets[0]?.uri) {
      setGcashQrUri(res.assets[0].uri);
    }
  };

  const handlePickMayaQR = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"] as any,
      allowsEditing: true,
      quality: 1,
    });
    if (!res.canceled && res.assets[0]?.uri) {
      setMayaQrUri(res.assets[0].uri);
    }
  };

  const handlePickBankQR = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"] as any,
      allowsEditing: true,
      quality: 1,
    });
    if (!res.canceled && res.assets[0]?.uri) {
      setBankQrUri(res.assets[0].uri);
    }
  };

  const handleSaveQRs = async () => {
    setSavingQRs(true);
    try {
      const saved = await updateStorePaymentQRs({
        gcashName: gcashName.trim() || undefined,
        gcashNumber: gcashNumber.trim() || undefined,
        gcashQrUri,
        mayaName: mayaName.trim() || undefined,
        mayaNumber: mayaNumber.trim() || undefined,
        mayaQrUri,
        bankName: bankName.trim() || undefined,
        bankAccountName: bankAccountName.trim() || undefined,
        bankAccountNumber: bankAccountNumber.trim() || undefined,
        bankQrUri,
      });
      if (!saved) {
        throw new Error("QR upload failed");
      }
      setQrModal(false);
      showAlert(translate(language, "savedAlert"), translate(language, "digitalQrUpdated"));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update digital payment QR codes.";
      showAlert("Error", message);
    } finally {
      setSavingQRs(false);
    }
  };

  const handleDataAction = (action: "sync" | "clear") => {
    if (action === "sync") {
      showAlert(translate(language, "syncCompleteTitle"), translate(language, "syncCompleteMsg"));
      return;
    }
    showAlert(translate(language, "activityLogTitle"), translate(language, "activityLogMsg"));
  };

  return (
    <ScreenContainer style={[styles.screen, { backgroundColor: theme.colors.background }]} contentContainerStyle={styles.screenContent}>
      <KeyboardAvoidingView style={styles.form} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scrollContent}>
        {/* Hero Header */}
        <View style={[styles.banner, { backgroundColor: theme.colors.primaryContainer, borderColor: theme.colors.outline }]}>
          <View style={styles.bannerTopRow}>
            <TouchableRipple onPress={handlePickAvatar} style={styles.avatarButton} borderless>
              {avatarUri ? (
                <Avatar.Image size={72} source={{ uri: avatarUri }} />
              ) : (
                <Avatar.Text size={72} label={state.user.avatarInitials || getInitials(session.name)} />
              )}
            </TouchableRipple>

            <View style={styles.bannerTextWrap}>
              <Text style={[styles.nameText, { color: theme.colors.onPrimaryContainer }]}>{state.user.name}</Text>
              <Text style={[styles.roleText, { color: theme.colors.onPrimaryContainer }]}>{session.role} · @{state.user.username}</Text>
              <Text style={[styles.metaText, { color: theme.colors.onPrimaryContainer }]}>{state.user.storeName || "StockTrack Store"}</Text>
            </View>

            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <IconButton icon="pencil-outline" iconColor={theme.colors.onPrimaryContainer} size={22} onPress={openProfileEdit} style={styles.editIcon} />
              <IconButton icon="cog-outline" iconColor={theme.colors.onPrimaryContainer} size={22} onPress={() => router.push("/settings")} style={{ margin: 0 }} />
            </View>
          </View>
        </View>

        {/* Profile Edit Card (if open) */}
        {editing ? (
          <Animated.View entering={FadeIn.duration(220)}>
            <Card style={[styles.editCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
              <Card.Content>
                <View style={styles.editHeaderRow}>
                  <View style={[styles.editHeaderIcon, { backgroundColor: theme.colors.primaryContainer }]}>
                    <IconButton icon="account-edit-outline" size={20} iconColor={theme.colors.primary} style={{ margin: 0 }} />
                  </View>
                  <Text style={[styles.cardTitle, { color: theme.colors.onSurface, marginBottom: 0 }]}>{translate(language, "editProfileLabel")}</Text>
                </View>

                <View style={styles.avatarEditRow}>
                  <TouchableRipple onPress={handlePickAvatar} style={styles.avatarEditButton} borderless>
                    {avatarUri ? <Avatar.Image size={64} source={{ uri: avatarUri }} /> : <Avatar.Text size={64} label={getInitials(name || state.user.name)} />}
                  </TouchableRipple>
                  <View style={styles.avatarActionsCol}>
                    <Button mode="contained-tonal" icon="image-outline" compact onPress={handlePickAvatar} style={styles.avatarActionButton} labelStyle={styles.avatarActionLabel}>{translate(language, "changeAvatarLabel")}</Button>
                    <Button mode="outlined" icon="camera-outline" compact onPress={handleTakeAvatarPhoto} style={styles.avatarActionButton} labelStyle={styles.avatarActionLabel}>{translate(language, "takePhoto")}</Button>
                  </View>
                </View>

                <TextInput label={translate(language, "nameLabel")} value={name} onChangeText={setName} mode="outlined" style={styles.input} left={<TextInput.Icon icon="account-outline" />} />
                <TextInput label={translate(language, "usernameLabel")} value={username} onChangeText={setUsername} mode="outlined" style={styles.input} left={<TextInput.Icon icon="at" />} />
                <TextInput label={translate(language, "phoneLabel")} value={phone} onChangeText={setPhone} mode="outlined" style={styles.input} keyboardType="phone-pad" left={<TextInput.Icon icon="phone-outline" />} />
                <TextInput label={translate(language, "storeAddressLabel")} value={address} onChangeText={setAddress} mode="outlined" style={styles.input} left={<TextInput.Icon icon="map-marker-outline" />} />

                <View style={styles.editActionRow}>
                  <Button mode="outlined" onPress={() => setEditing(false)} style={styles.editActionButton}>{translate(language, "cancelButton")}</Button>
                  <Button mode="contained" onPress={handleSaveProfile} loading={saving} style={styles.editActionButton}>{translate(language, "saveButton")}</Button>
                </View>
              </Card.Content>
            </Card>
          </Animated.View>
        ) : null}

        {/* 2px Underline Tab Bar */}
        <View style={[styles.tabBar, { borderBottomColor: theme.colors.outline }]}>
          {profileTabs.map((tab) => {
            const selected = activeTab === tab;
            const tabLabel = tab === "Account" ? translate(language, "tabAccount") : tab === "Store" ? translate(language, "tabStore") : translate(language, "tabTeam");
            return (
              <Pressable
                key={tab}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                onPress={() => setActiveTab(tab)}
                style={[
                  styles.tabButton,
                  selected && { borderBottomColor: theme.colors.primary, borderBottomWidth: 2 },
                ]}
              >
                <Text
                  style={[
                    styles.tabButtonText,
                    { color: selected ? theme.colors.primary : theme.colors.onSurfaceVariant, fontWeight: selected ? "700" : "500" },
                  ]}
                >
                  {tabLabel}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* TAB 1 — ACCOUNT */}
        {activeTab === "Account" && (
          <Animated.View entering={FadeIn.duration(200)} key="account-tab">
            <Text style={[styles.groupHeader, { color: theme.colors.onSurfaceVariant }]}>{translate(language, "personalInfoHeader")}</Text>
            <View style={[styles.groupContainer, { backgroundColor: theme.colors.surface }]}>
              <View style={styles.rowInner}>
                <View style={styles.rowIconWrap}>
                  <MaterialCommunityIcons name="account-outline" size={18} color={theme.colors.primary} />
                </View>
                <View style={styles.rowTextWrap}>
                  <Text style={[styles.rowTitle, { color: theme.colors.onSurface }]}>{translate(language, "fullNameLabel")}</Text>
                </View>
                <Text style={[styles.rowValue, { color: theme.colors.onSurfaceVariant }]}>{state.user.name}</Text>
              </View>

              <Divider style={{ backgroundColor: theme.colors.outline }} />

              <View style={styles.rowInner}>
                <View style={styles.rowIconWrap}>
                  <MaterialCommunityIcons name="at" size={18} color={theme.colors.primary} />
                </View>
                <View style={styles.rowTextWrap}>
                  <Text style={[styles.rowTitle, { color: theme.colors.onSurface }]}>{translate(language, "usernameLabel")}</Text>
                </View>
                <Text style={[styles.rowValue, { color: theme.colors.onSurfaceVariant }]}>@{state.user.username}</Text>
              </View>

              <Divider style={{ backgroundColor: theme.colors.outline }} />

              <View style={styles.rowInner}>
                <View style={styles.rowIconWrap}>
                  <MaterialCommunityIcons name="phone-outline" size={18} color={theme.colors.primary} />
                </View>
                <View style={styles.rowTextWrap}>
                  <Text style={[styles.rowTitle, { color: theme.colors.onSurface }]}>{translate(language, "phoneLabel")}</Text>
                </View>
                <Text style={[styles.rowValue, { color: theme.colors.onSurfaceVariant }]}>{state.user.phone || translate(language, "notProvided")}</Text>
              </View>

              <Divider style={{ backgroundColor: theme.colors.outline }} />

              <View style={styles.rowInner}>
                <View style={styles.rowIconWrap}>
                  <MaterialCommunityIcons name="map-marker-outline" size={18} color={theme.colors.primary} />
                </View>
                <View style={styles.rowTextWrap}>
                  <Text style={[styles.rowTitle, { color: theme.colors.onSurface }]}>{translate(language, "storeAddressLabel")}</Text>
                </View>
                <Text style={[styles.rowValue, { color: theme.colors.onSurfaceVariant }]}>{state.user.address || translate(language, "notProvided")}</Text>
              </View>

              <Divider style={{ backgroundColor: theme.colors.outline }} />

              <View style={styles.rowInner}>
                <View style={styles.rowIconWrap}>
                  <MaterialCommunityIcons name="shield-account-outline" size={18} color={theme.colors.primary} />
                </View>
                <View style={styles.rowTextWrap}>
                  <Text style={[styles.rowTitle, { color: theme.colors.onSurface }]}>{translate(language, "roleLabel")}</Text>
                </View>
                <Chip compact style={{ backgroundColor: theme.colors.surfaceVariant }} textStyle={{ color: theme.colors.primary, fontSize: 11, fontWeight: "600" }}>{session.role}</Chip>
              </View>

              <Divider style={{ backgroundColor: theme.colors.outline }} />

              <TouchableRipple onPress={openProfileEdit} borderless>
                <View style={styles.rowInner}>
                  <View style={styles.rowIconWrap}>
                    <MaterialCommunityIcons name="account-edit-outline" size={18} color={theme.colors.primary} />
                  </View>
                  <View style={styles.rowTextWrap}>
                    <Text style={[styles.rowTitle, { color: theme.colors.primary }]}>{translate(language, "editProfileDetails")}</Text>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={18} color={theme.colors.onSurfaceVariant} />
                </View>
              </TouchableRipple>
            </View>

            <Text style={[styles.groupHeader, { color: theme.colors.onSurfaceVariant }]}>{translate(language, "preferencesAndSettingsHeader")}</Text>
            <View style={[styles.groupContainer, { backgroundColor: theme.colors.surface }]}>
              <TouchableRipple onPress={() => router.push("/settings")} borderless>
                <View style={styles.rowInner}>
                  <View style={styles.rowIconWrap}>
                    <MaterialCommunityIcons name="cog-outline" size={18} color={theme.colors.primary} />
                  </View>
                  <View style={styles.rowTextWrap}>
                    <Text style={[styles.rowTitle, { color: theme.colors.primary }]}>{translate(language, "appSettingsAndTheme")}</Text>
                    <Text style={[styles.rowSubtitle, { color: theme.colors.onSurfaceVariant }]}>{translate(language, "appSettingsSubtitle")}</Text>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={18} color={theme.colors.onSurfaceVariant} />
                </View>
              </TouchableRipple>
            </View>

            <Text style={[styles.groupHeader, { color: theme.colors.onSurfaceVariant }]}>{translate(language, "thisMonthActivityHeader")}</Text>
            <View style={[styles.groupContainer, { backgroundColor: theme.colors.surface }]}>
              <View style={styles.rowInner}>
                <View style={styles.rowIconWrap}>
                  <MaterialCommunityIcons name="arrow-top-right" size={18} color={theme.colors.primary} />
                </View>
                <View style={styles.rowTextWrap}>
                  <Text style={[styles.rowTitle, { color: theme.colors.onSurface }]}>{translate(language, "stockInsRecorded")}</Text>
                </View>
                <Text style={[styles.rowValue, { color: theme.colors.primary, fontWeight: "700" }]}>{monthlyStockIns}</Text>
              </View>

              <Divider style={{ backgroundColor: theme.colors.outline }} />

              <View style={styles.rowInner}>
                <View style={styles.rowIconWrap}>
                  <MaterialCommunityIcons name="arrow-bottom-right" size={18} color={theme.colors.secondary} />
                </View>
                <View style={styles.rowTextWrap}>
                  <Text style={[styles.rowTitle, { color: theme.colors.onSurface }]}>{translate(language, "stockOutsRecorded")}</Text>
                </View>
                <Text style={[styles.rowValue, { color: theme.colors.secondary, fontWeight: "700" }]}>{monthlyStockOuts}</Text>
              </View>

              <Divider style={{ backgroundColor: theme.colors.outline }} />

              <View style={styles.rowInner}>
                <View style={styles.rowIconWrap}>
                  <MaterialCommunityIcons name="alert-circle-outline" size={18} color={theme.colors.tertiary} />
                </View>
                <View style={styles.rowTextWrap}>
                  <Text style={[styles.rowTitle, { color: theme.colors.onSurface }]}>{translate(language, "lowStockResolved")}</Text>
                </View>
                <Text style={[styles.rowValue, { color: theme.colors.onSurfaceVariant }]}>
                  {state.notifications.filter((n) => n.type === "low_stock" && n.isRead && n.createdAt.slice(0, 7) === currentMonth).length}
                </Text>
              </View>

              <Divider style={{ backgroundColor: theme.colors.outline }} />

              <View style={styles.rowInner}>
                <View style={styles.rowIconWrap}>
                  <MaterialCommunityIcons name="calendar-check-outline" size={18} color={theme.colors.primary} />
                </View>
                <View style={styles.rowTextWrap}>
                  <Text style={[styles.rowTitle, { color: theme.colors.onSurface }]}>{translate(language, "expiryAlertsActed")}</Text>
                </View>
                <Text style={[styles.rowValue, { color: theme.colors.onSurfaceVariant }]}>{monthlyExpiryAlerts}</Text>
              </View>
            </View>

            <Text style={[styles.groupHeader, { color: theme.colors.onSurfaceVariant }]}>{translate(language, "dangerZoneHeader")}</Text>
            <View style={[styles.groupContainer, { backgroundColor: theme.colors.surface }]}>
              <TouchableRipple onPress={() => handleDataAction("clear")} borderless>
                <View style={styles.destructiveRow}>
                  <MaterialCommunityIcons name="delete-outline" size={18} color={theme.colors.error} />
                  <Text style={[styles.destructiveText, { color: theme.colors.error }]}>{translate(language, "clearActivityLog")}</Text>
                </View>
              </TouchableRipple>

              <Divider style={{ backgroundColor: theme.colors.outline }} />

              <TouchableRipple onPress={() => router.push("/delete-account")} borderless>
                <View style={styles.destructiveRow}>
                  <MaterialCommunityIcons name="account-remove-outline" size={18} color={theme.colors.error} />
                  <Text style={[styles.destructiveText, { color: theme.colors.error }]}>{translate(language, "requestAccountDeletion")}</Text>
                </View>
              </TouchableRipple>

              <Divider style={{ backgroundColor: theme.colors.outline }} />

              <TouchableRipple onPress={() => { void handleLogout(); }} borderless>
                <View style={styles.destructiveRow}>
                  <MaterialCommunityIcons name="logout" size={18} color={theme.colors.error} />
                  <Text style={[styles.destructiveText, { color: theme.colors.error }]}>{translate(language, "logOutButton")}</Text>
                </View>
              </TouchableRipple>
            </View>
          </Animated.View>
        )}

        {/* TAB 2 — STORE */}
        {activeTab === "Store" && (
          <Animated.View entering={FadeIn.duration(200)} key="store-tab">
            <Text style={[styles.groupHeader, { color: theme.colors.onSurfaceVariant }]}>{translate(language, "storeInfoHeader")}</Text>
            <View style={[styles.groupContainer, { backgroundColor: theme.colors.surface }]}>
              <TouchableRipple onPress={openStoreModal} borderless>
                <View style={styles.rowInner}>
                  <View style={styles.rowIconWrap}>
                    <MaterialCommunityIcons name="storefront-outline" size={18} color={theme.colors.primary} />
                  </View>
                  <View style={styles.rowTextWrap}>
                    <Text style={[styles.rowTitle, { color: theme.colors.onSurface }]}>{translate(language, "storeNameLabel")}</Text>
                  </View>
                  <View style={styles.rowRightWrap}>
                    <Text style={[styles.rowValue, { color: theme.colors.onSurfaceVariant }]}>{storeName || "StockTrack Store"}</Text>
                    <MaterialCommunityIcons name="pencil-outline" size={16} color={theme.colors.onSurfaceVariant} />
                  </View>
                </View>
              </TouchableRipple>

              <Divider style={{ backgroundColor: theme.colors.outline }} />

              <View style={styles.rowInner}>
                <View style={styles.rowIconWrap}>
                  <MaterialCommunityIcons name="identifier" size={18} color={theme.colors.primary} />
                </View>
                <View style={[styles.rowTextWrap, { flexShrink: 0, minWidth: 80 }]}>
                  <Text style={[styles.rowTitle, { color: theme.colors.onSurface }]}>{translate(language, "storeIdLabel")}</Text>
                </View>
                <Text numberOfLines={1} ellipsizeMode="middle" style={[styles.rowValue, { color: theme.colors.onSurfaceVariant, flexShrink: 1, maxWidth: "60%" }]}>{state.user.storeId || "—"}</Text>
              </View>

              <Divider style={{ backgroundColor: theme.colors.outline }} />

              <View style={styles.rowInner}>
                <View style={styles.rowIconWrap}>
                  <MaterialCommunityIcons name="map-marker-outline" size={18} color={theme.colors.primary} />
                </View>
                <View style={styles.rowTextWrap}>
                  <Text style={[styles.rowTitle, { color: theme.colors.onSurface }]}>Address</Text>
                </View>
                <Text style={[styles.rowValue, { color: theme.colors.onSurfaceVariant }]}>{storeAddress || "Not provided"}</Text>
              </View>

              <Divider style={{ backgroundColor: theme.colors.outline }} />

              <View style={styles.rowInner}>
                <View style={styles.rowIconWrap}>
                  <MaterialCommunityIcons name="phone-outline" size={18} color={theme.colors.primary} />
                </View>
                <View style={styles.rowTextWrap}>
                  <Text style={[styles.rowTitle, { color: theme.colors.onSurface }]}>Phone</Text>
                </View>
                <Text style={[styles.rowValue, { color: theme.colors.onSurfaceVariant }]}>{storePhone || "Not provided"}</Text>
              </View>

              <Divider style={{ backgroundColor: theme.colors.outline }} />

              <View style={styles.rowInner}>
                <View style={styles.rowIconWrap}>
                  <MaterialCommunityIcons name="cash-multiple" size={18} color={theme.colors.primary} />
                </View>
                <View style={styles.rowTextWrap}>
                  <Text style={[styles.rowTitle, { color: theme.colors.onSurface }]}>Currency</Text>
                </View>
                <Text style={[styles.rowValue, { color: theme.colors.onSurfaceVariant }]}>PHP (₱)</Text>
              </View>
            </View>

            <Text style={[styles.groupHeader, { color: theme.colors.onSurfaceVariant }]}>DIGITAL PAYMENT QRS</Text>
            <View style={[styles.groupContainer, { backgroundColor: theme.colors.surface }]}>
              <View style={styles.rowInner}>
                <View style={styles.rowIconWrap}>
                  <MaterialCommunityIcons name="qrcode-scan" size={18} color={theme.colors.primary} />
                </View>
                <View style={styles.rowTextWrap}>
                  <Text style={[styles.rowTitle, { color: theme.colors.onSurface }]}>GCash QR</Text>
                  <Text style={[styles.rowSubtitle, { color: theme.colors.onSurfaceVariant }]}>
                    {gcashNumber ? `${gcashName ? gcashName + " · " : ""}${gcashNumber}` : "Not configured"}
                  </Text>
                </View>
                <Chip
                  compact
                  style={{ backgroundColor: gcashNumber ? `${theme.colors.secondary}18` : theme.colors.surfaceVariant }}
                  textStyle={{ color: gcashNumber ? theme.colors.secondary : theme.colors.onSurfaceVariant, fontSize: 11, fontWeight: "600" }}
                >
                  {gcashNumber ? "Active" : "Not set"}
                </Chip>
              </View>

              <Divider style={{ backgroundColor: theme.colors.outline }} />

              <View style={styles.rowInner}>
                <View style={styles.rowIconWrap}>
                  <MaterialCommunityIcons name="qrcode-scan" size={18} color={theme.colors.secondary} />
                </View>
                <View style={styles.rowTextWrap}>
                  <Text style={[styles.rowTitle, { color: theme.colors.onSurface }]}>Maya QR</Text>
                  <Text style={[styles.rowSubtitle, { color: theme.colors.onSurfaceVariant }]}>
                    {mayaNumber ? `${mayaName ? mayaName + " · " : ""}${mayaNumber}` : "Not configured"}
                  </Text>
                </View>
                <Chip
                  compact
                  style={{ backgroundColor: mayaNumber ? `${theme.colors.secondary}18` : theme.colors.surfaceVariant }}
                  textStyle={{ color: mayaNumber ? theme.colors.secondary : theme.colors.onSurfaceVariant, fontSize: 11, fontWeight: "600" }}
                >
                  {mayaNumber ? "Active" : "Not set"}
                </Chip>
              </View>

              <Divider style={{ backgroundColor: theme.colors.outline }} />

              <View style={styles.rowInner}>
                <View style={styles.rowIconWrap}>
                  <MaterialCommunityIcons name="bank-outline" size={18} color="#7C3AED" />
                </View>
                <View style={styles.rowTextWrap}>
                  <Text style={[styles.rowTitle, { color: theme.colors.onSurface }]}>Bank / QR Ph</Text>
                  <Text style={[styles.rowSubtitle, { color: theme.colors.onSurfaceVariant }]}>
                    {state.user.storeQRs?.bankAccountNumber
                      ? `${state.user.storeQRs?.bankName ? state.user.storeQRs.bankName + " · " : ""}${state.user.storeQRs.bankAccountNumber}`
                      : "Not configured"}
                  </Text>
                </View>
                <Chip
                  compact
                  style={{ backgroundColor: state.user.storeQRs?.bankAccountNumber ? `${theme.colors.secondary}18` : theme.colors.surfaceVariant }}
                  textStyle={{ color: state.user.storeQRs?.bankAccountNumber ? theme.colors.secondary : theme.colors.onSurfaceVariant, fontSize: 11, fontWeight: "600" }}
                >
                  {state.user.storeQRs?.bankAccountNumber ? "Active" : "Not set"}
                </Chip>
              </View>

              <Divider style={{ backgroundColor: theme.colors.outline }} />

              <TouchableRipple onPress={openQrModal} borderless>
                <View style={styles.rowInner}>
                  <View style={styles.rowIconWrap}>
                    <MaterialCommunityIcons name="cog-outline" size={18} color={theme.colors.primary} />
                  </View>
                  <View style={styles.rowTextWrap}>
                    <Text style={[styles.rowTitle, { color: theme.colors.primary }]}>{translate(language, "setUpPaymentQrs")}</Text>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={18} color={theme.colors.onSurfaceVariant} />
                </View>
              </TouchableRipple>
            </View>

            <Text style={[styles.groupHeader, { color: theme.colors.onSurfaceVariant }]}>{translate(language, "storeHealthHeader")}</Text>
            <View style={[styles.groupContainer, { backgroundColor: theme.colors.surface }]}>
              <View style={styles.rowInner}>
                <View style={styles.rowIconWrap}>
                  <MaterialCommunityIcons name="shield-check-outline" size={18} color={theme.colors.secondary} />
                </View>
                <View style={styles.rowTextWrap}>
                  <Text style={[styles.rowTitle, { color: theme.colors.onSurface }]}>{translate(language, "operatingStatus")}</Text>
                  <Text style={[styles.rowSubtitle, { color: theme.colors.onSurfaceVariant }]}>{translate(language, "operatingStatusSubtitle")}</Text>
                </View>
                <Chip
                  compact
                  style={{ backgroundColor: `${theme.colors.secondary}18` }}
                  textStyle={{ color: theme.colors.secondary, fontSize: 11, fontWeight: "600" }}
                >
                  {state.products.length ? Math.round((summary.inStock / Math.max(summary.totalProducts, 1)) * 100) : 100}% {translate(language, "operational")}
                </Chip>
              </View>
            </View>

            <View style={{ marginTop: 16 }}>
              <ShiftsSection language={language} />
            </View>
          </Animated.View>
        )}

        {/* TAB 3 — TEAM */}
        {activeTab === "Team" && canViewTeam && (
          <Animated.View entering={FadeIn.duration(200)} key="team-tab">
            <Text style={[styles.groupHeader, { color: theme.colors.onSurfaceVariant }]}>{translate(language, "teamMembersHeader")} ({employees.length})</Text>
            <View style={[styles.groupContainer, { backgroundColor: theme.colors.surface }]}>
              {employees.length === 0 ? (
                <View style={styles.rowInner}>
                  <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 13 }}>{translate(language, "noEmployeesYet")}</Text>
                </View>
              ) : (
                employees.map((employee, idx) => (
                  <View key={employee.id}>
                    {idx > 0 ? <Divider style={{ backgroundColor: theme.colors.outline }} /> : null}
                    <View style={styles.rowInner}>
                      <View style={styles.rowIconWrap}>
                        <Avatar.Text
                          size={32}
                          label={getInitials(employee.name)}
                          style={{ backgroundColor: theme.colors.surfaceVariant }}
                          color={theme.colors.primary}
                        />
                      </View>
                      <View style={[styles.rowTextWrap, { marginLeft: 8, minWidth: 0 }]}>
                        <Text numberOfLines={1} style={[styles.rowTitle, { color: theme.colors.onSurface }]}>{employee.name}</Text>
                        <Text numberOfLines={1} ellipsizeMode="tail" style={[styles.rowSubtitle, { color: theme.colors.onSurfaceVariant }]}>{employee.email}</Text>
                      </View>
                      <Chip compact style={{ backgroundColor: theme.colors.surfaceVariant, marginRight: 4 }} textStyle={{ color: theme.colors.primary, fontSize: 11, fontWeight: "600" }}>{employee.role}</Chip>
                      {isAdmin ? (
                        <View style={{ flexDirection: "row", alignItems: "center" }}>
                          <IconButton icon="pencil-outline" size={18} onPress={() => openEmployeeEditor(employee)} />
                          <IconButton
                            icon={employee.status === "Active" ? "account-cancel-outline" : "account-check-outline"}
                            size={18}
                            onPress={() => toggleEmployeeStatus(employee)}
                          />
                          <IconButton icon="delete-outline" size={18} iconColor={theme.colors.error} onPress={() => handleRemoveEmployee(employee.id)} />
                        </View>
                      ) : null}
                    </View>
                  </View>
                ))
              )}
            </View>

            {isAdmin ? (
              <>
                <View style={[styles.teamPendingHeading, { marginTop: 18 }]}>
                  <Text style={[styles.groupHeader, { color: theme.colors.onSurfaceVariant, marginBottom: 0 }]}>
                    Pending Invites ({pendingInvites.length})
                  </Text>
                  <IconButton icon="refresh" size={18} onPress={() => {
                    void refreshPendingInvites().catch((error) => {
                      setEmployeeMessage(error instanceof Error ? error.message : String(error));
                    });
                  }} accessibilityLabel="Refresh pending invites" />
                </View>
                <View style={[styles.groupContainer, { backgroundColor: theme.colors.surface }]}>
                  {pendingInvites.length === 0 ? (
                    <View style={styles.rowInner}>
                      <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 13 }}>No pending invitations.</Text>
                    </View>
                  ) : (
                    pendingInvites.map((invite, idx) => (
                      <View key={invite.id}>
                        {idx > 0 ? <Divider style={{ backgroundColor: theme.colors.outline }} /> : null}
                        <View style={styles.rowInner}>
                          <View style={styles.rowIconWrap}>
                            <MaterialCommunityIcons name="email-lock-outline" size={20} color={theme.colors.primary} />
                          </View>
                          <View style={[styles.rowTextWrap, { marginLeft: 8, minWidth: 0 }]}>
                            <Text numberOfLines={1} style={[styles.rowTitle, { color: theme.colors.onSurface }]}>{invite.email}</Text>
                            <Text style={[styles.rowSubtitle, { color: theme.colors.onSurfaceVariant }]}>
                              {invite.role} · Invited {new Date(invite.createdAt).toLocaleDateString()}
                            </Text>
                          </View>
                          <IconButton icon="email-sync-outline" size={18} onPress={() => void handleResendInvite(invite)} accessibilityLabel={`Resend invitation to ${invite.email}`} />
                          <IconButton icon="close-circle-outline" size={18} iconColor={theme.colors.error} onPress={() => handleRevokeInvite(invite)} accessibilityLabel={`Revoke invitation for ${invite.email}`} />
                        </View>
                      </View>
                    ))
                  )}
                </View>
                {employeeMessage ? <Text style={[styles.helperText, { color: theme.colors.onSurfaceVariant }]}>{employeeMessage}</Text> : null}
              </>
            ) : null}

            {isAdmin ? (
              <Button
                mode="contained"
                icon="account-plus-outline"
                buttonColor={theme.colors.primary}
                onPress={() => openEmployeeEditor()}
                style={{ marginTop: 14, borderRadius: 16 }}
              >
                {translate(language, "addTeamMember")}
              </Button>
            ) : null}

            {managerMode && (
              <Card style={[styles.innerCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline, marginTop: 14 }]}>
                <Card.Content>
                  <Text style={[styles.subTitle, { color: theme.colors.onSurface }]}>
                    {managerMode === "add" ? translate(language, "addEmployeeTitle") : translate(language, "editEmployeeTitle")}
                  </Text>
                  <TextInput label={translate(language, "nameLabel")} value={employeeForm.name} onChangeText={(text) => setEmployeeForm((prev) => ({ ...prev, name: text }))} mode="outlined" style={styles.input} />
                  <TextInput label={translate(language, "emailLabel")} value={employeeForm.email} onChangeText={(text) => setEmployeeForm((prev) => ({ ...prev, email: text }))} mode="outlined" style={styles.input} autoCapitalize="none" keyboardType="email-address" />
                  <View style={[styles.actionRow, styles.button]}>
                    <Button mode="outlined" onPress={() => setEmployeeForm((prev) => ({ ...prev, role: roleOptions[(roleOptions.indexOf(prev.role) + 1) % roleOptions.length] }))} style={styles.actionButtonHalf} labelStyle={styles.actionButtonLabel}>
                      {translate(language, "roleLabel")}: {employeeForm.role}
                    </Button>
                    <Button mode="outlined" onPress={() => setEmployeeForm((prev) => ({ ...prev, status: prev.status === "Active" ? "Inactive" : "Active" }))} style={styles.actionButtonHalf} labelStyle={styles.actionButtonLabel}>
                      {translate(language, "statusLabel")}: {employeeForm.status}
                    </Button>
                  </View>
                  {employeeMessage && <Text style={[styles.helperText, { color: theme.colors.error }]}>{employeeMessage}</Text>}
                  <View style={[styles.actionRow, styles.button]}>
                    <Button mode="contained" onPress={handleSaveEmployee} style={styles.actionButtonHalf}>{translate(language, "saveButton")}</Button>
                    <Button mode="outlined" onPress={resetEmployeeEditor} style={styles.actionButtonHalf}>{translate(language, "cancelButton")}</Button>
                  </View>
                </Card.Content>
              </Card>
            )}
          </Animated.View>
        )}
      </ScrollView>
      </KeyboardAvoidingView>

      {/* Store Information Modal */}
      <ProfileStoreModal
        visible={modal === "store"}
        storeName={storeName}
        setStoreName={setStoreName}
        storeAddress={storeAddress}
        setStoreAddress={setStoreAddress}
        storePhone={storePhone}
        setStorePhone={setStorePhone}
        storeEmail={storeEmail}
        setStoreEmail={setStoreEmail}
        businessHours={businessHours}
        setBusinessHours={setBusinessHours}
        permitNumber={permitNumber}
        setPermitNumber={setPermitNumber}
        keyboardOffset={keyboardOffset}
        onSave={saveStoreInformation}
        onClose={() => setModal(null)}
        language={language}
        theme={theme}
      />

      {/* Digital Payment QRs Modal */}
      <ProfileQrModal
        visible={qrModal}
        gcashName={gcashName}
        setGcashName={setGcashName}
        gcashNumber={gcashNumber}
        setGcashNumber={setGcashNumber}
        gcashQrUri={gcashQrUri}
        mayaName={mayaName}
        setMayaName={setMayaName}
        mayaNumber={mayaNumber}
        setMayaNumber={setMayaNumber}
        mayaQrUri={mayaQrUri}
        bankName={bankName}
        setBankName={setBankName}
        bankAccountName={bankAccountName}
        setBankAccountName={setBankAccountName}
        bankAccountNumber={bankAccountNumber}
        setBankAccountNumber={setBankAccountNumber}
        bankQrUri={bankQrUri}
        onPickBankQR={handlePickBankQR}
        keyboardOffset={keyboardOffset}
        onPickGCashQR={handlePickGCashQR}
        onPickMayaQR={handlePickMayaQR}
        saving={savingQRs}
        onSave={handleSaveQRs}
        onClose={() => setQrModal(false)}
        language={language}
        theme={theme}
      />

      <ExportFormatDialog
        visible={exportDialog === "inventory"}
        title={translate(language, "exportInventoryData")}
        onDismiss={() => setExportDialog(null)}
        onSelectExcel={() => downloadInventoryExcel(state)}
        onSelectWord={() => downloadInventoryWord(state)}
      />
      <ExportFormatDialog
        visible={exportDialog === "activity"}
        title={translate(language, "exportActivityLog")}
        onDismiss={() => setExportDialog(null)}
        onSelectExcel={() => downloadActivityLogExcel(state)}
        onSelectWord={() => downloadActivityLogWord(state)}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  form: { flex: 1 },
  scrollContent: { paddingBottom: 88 },
  screenContent: { padding: 16, paddingBottom: 88 },
  banner: {
    padding: 18,
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: 16,
  },
  bannerTopRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatarButton: { borderRadius: 36, overflow: "hidden" },
  bannerTextWrap: { flex: 1 },
  nameText: { fontSize: 22, fontWeight: "700" },
  roleText: { marginTop: 2, fontSize: 13, opacity: 0.9 },
  metaText: { marginTop: 2, fontSize: 12, opacity: 0.8 },
  editIcon: { marginLeft: 6 },
  tabBar: {
    flexDirection: "row",
    height: 44,
    marginBottom: 14,
    alignItems: "stretch",
    borderBottomWidth: 1,
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 8,
  },
  tabButtonText: {
    fontSize: 14,
  },
  groupHeader: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1.1,
    textTransform: "uppercase",
    marginBottom: 6,
    marginLeft: 4,
    marginTop: 14,
  },
  teamPendingHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  groupContainer: {
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 6,
  },
  rowInner: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  rowIconWrap: {
    width: 28,
    alignItems: "flex-start",
  },
  rowTextWrap: {
    flex: 1,
    justifyContent: "center",
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: "500",
  },
  rowSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  rowRightWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginLeft: "auto",
  },
  rowValue: {
    fontSize: 13,
    fontWeight: "500",
    marginLeft: "auto",
  },
  destructiveRow: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  destructiveText: {
    fontSize: 15,
    fontWeight: "600",
  },
  cardTitle: { fontSize: 17, fontWeight: "600", marginBottom: 12 },
  helperText: { marginBottom: 12, lineHeight: 20 },
  actionRow: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  actionButtonHalf: { flex: 1, minWidth: 120 },
  actionButtonLabel: { fontSize: 13 },
  button: { marginTop: 10 },
  input: { marginBottom: 14, backgroundColor: "transparent" },
  innerCard: { borderRadius: 16, borderWidth: 1, marginTop: 12 },
  subTitle: { fontSize: 15, fontWeight: "600", marginBottom: 10 },
  modal: { margin: 0, marginTop: "auto", padding: 20, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  modalHeaderTitleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  modalScroll: { flexGrow: 0 },
  editCard: { borderRadius: 16, marginBottom: 14, borderWidth: 1, elevation: 0 },
  editHeaderRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 },
  editHeaderIcon: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  avatarEditRow: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 18 },
  avatarEditButton: { borderRadius: 32, overflow: "hidden" },
  avatarActionsCol: { flex: 1, gap: 8 },
  avatarActionButton: { borderRadius: 8 },
  avatarActionLabel: { fontSize: 12 },
  editActionRow: { flexDirection: "row", gap: 10, marginTop: 6 },
  editActionButton: { flex: 1, borderRadius: 16 },
});
