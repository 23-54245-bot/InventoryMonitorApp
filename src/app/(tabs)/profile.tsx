import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Camera } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Dimensions, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Avatar, Button, Card, Chip, IconButton, List, Modal, Portal, ProgressBar, Text, TextInput, TouchableRipple, useTheme } from "react-native-paper";
import Animated, { FadeIn } from "react-native-reanimated";

import { ExportFormatDialog } from "../../components/export-format-dialog";
import { ScreenContainer } from "../../components/screen-container";
import { useAuth, type Employee, type EmployeeStatus, type UserRole } from "../../context/auth";
import { useStore } from "../../context/store";
import { showAlert } from "../../lib/alert";
import { translate } from "../../lib/i18n";
import { downloadActivityLogExcel, downloadActivityLogWord, downloadInventoryExcel, downloadInventoryWord, printInventoryData } from "../../lib/inventory-export";

const roleOptions: UserRole[] = ["Admin", "Manager", "Staff"];
const profileTabs = ["Account", "Store", "Team", "Activity"] as const;

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
  const router = useRouter();
  const theme = useTheme();
  const { session, employees, addEmployee, updateEmployee, removeEmployee } = useAuth();
  const { state, summary, updateUserProfile } = useStore();
  const language = state.user.preferences.language;
  const currentMonth = new Date().toISOString().slice(0, 7);
  const monthlyMovements = state.movements.filter((movement) => movement.timestamp.slice(0, 7) === currentMonth);
  const monthlyStockIns = monthlyMovements.filter((movement) => movement.type === "in").reduce((total, movement) => total + movement.quantity, 0);
  const monthlyStockOuts = monthlyMovements.filter((movement) => movement.type === "out").reduce((total, movement) => total + movement.quantity, 0);
  const monthlyExpiryAlerts = state.notifications.filter((notification) => notification.type === "expiry" && notification.createdAt.slice(0, 7) === currentMonth).length;

  const [activeTab, setActiveTab] = useState<(typeof profileTabs)[number]>("Account");
  const [modal, setModal] = useState<"store" | null>(null);
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
  const [managerMode, setManagerMode] = useState<"add" | "edit" | null>(null);
  const [employeeForm, setEmployeeForm] = useState({ id: "", name: "", email: "", role: "Staff" as UserRole, status: "Active" as EmployeeStatus });
  const [employeeMessage, setEmployeeMessage] = useState<string | null>(null);
  const [keyboardOffset, setKeyboardOffset] = useState(0);

  useEffect(() => {
    setStoreName(state.user.storeName);
    setStoreAddress(state.user.address ?? "");
    setStorePhone(state.user.phone ?? "");
    setStoreEmail(state.user.storeEmail);
    setBusinessHours(state.user.businessHours ?? "");
    setPermitNumber(state.user.permitNumber ?? state.user.storeId ?? "");
    setName(state.user.name);
    setUsername(state.user.username);
    setPhone(state.user.phone ?? "");
    setAddress(state.user.address ?? "");
    setAvatarUri(state.user.avatarUri);
  }, [state.user]);

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
  const canViewTeam = session?.role === "Admin" || session?.role === "Manager";

  const memberCountLabel = useMemo(() => `${employees.length} Members`, [employees.length]);

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
      showAlert("Camera Access Needed", "Allow camera access in your phone settings to take a profile photo.");
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
      showAlert("Camera Unavailable", "The camera could not be opened. Close and reopen Expo Go, then try again.");
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
    if (!isAdmin) return;

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
    if (!isAdmin) return;
    const result = await removeEmployee(employeeId);
    setEmployeeMessage(result.message);
  };

  const toggleEmployeeStatus = async (employee: Employee) => {
    if (!isAdmin) return;
    const nextStatus: EmployeeStatus = employee.status === "Active" ? "Inactive" : "Active";
    const result = await updateEmployee(employee.id, { status: nextStatus });
    setEmployeeMessage(result.message);
  };

  const saveStoreInformation = () => {
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

  const handleDataAction = (action: "sync" | "clear") => {
    if (action === "sync") {
      showAlert("Sync complete", "Your inventory data is up to date.");
      return;
    }
    showAlert("Activity log", "Activity history is retained by the inventory record and cannot be cleared here.");
  };

  return (
    <ScreenContainer style={[styles.screen, { backgroundColor: theme.colors.background }]} contentContainerStyle={styles.screenContent}>
      <KeyboardAvoidingView style={styles.form} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scrollContent}>
        <View style={[styles.banner, { backgroundColor: theme.colors.primaryContainer }]}>
          <View style={styles.bannerTopRow}>
            <TouchableRipple onPress={handlePickAvatar} style={styles.avatarButton} borderless>
              {avatarUri ? (
                <Avatar.Image size={72} source={{ uri: avatarUri }} />
              ) : (
                <Avatar.Text size={72} label={state.user.avatarInitials || getInitials(session.name)} />
              )}
            </TouchableRipple>

            <View style={styles.bannerTextWrap}>
              <Text style={[styles.nameText, { color: theme.colors.onPrimaryContainer }]}>{session.name}</Text>
              <Text style={[styles.roleText, { color: theme.colors.onPrimaryContainer }]}>{session.title}</Text>
              <Text style={[styles.metaText, { color: theme.colors.onPrimaryContainer }]}>{state.user.storeName || "Store name not set"}</Text>
            </View>

            <IconButton
              icon={editing ? "close" : "pencil-outline"}
              size={20}
              iconColor={theme.colors.onPrimaryContainer}
              style={[styles.editIcon, { backgroundColor: `${theme.colors.onPrimaryContainer}10` }]}
              onPress={() => setEditing((current) => !current)}
            />
          </View>

          <View style={styles.metricRow}>
            <MetricCard label={translate(language, "statProducts")} value={String(summary.totalProducts)} accent={theme.colors.primary} theme={theme} />
            <MetricCard label={translate(language, "statLowStock")} value={String(summary.lowStock)} accent={theme.colors.tertiary} theme={theme} />
            <MetricCard label={translate(language, "recentActivityTitle")} value={memberCountLabel} accent={theme.colors.primary} theme={theme} />
          </View>
        </View>

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
                  <Button mode="outlined" icon="camera-outline" compact onPress={handleTakeAvatarPhoto} style={styles.avatarActionButton} labelStyle={styles.avatarActionLabel}>Take Photo</Button>
                </View>
              </View>

              <TextInput label={translate(language, "nameLabel")} value={name} onChangeText={setName} mode="outlined" style={styles.input} left={<TextInput.Icon icon="account-outline" />} />
              <TextInput label={translate(language, "usernameLabel")} value={username} onChangeText={setUsername} mode="outlined" style={styles.input} left={<TextInput.Icon icon="at" />} />
              <TextInput label="Phone" value={phone} onChangeText={setPhone} mode="outlined" style={styles.input} keyboardType="phone-pad" left={<TextInput.Icon icon="phone-outline" />} />
              <TextInput label="Store Address" value={address} onChangeText={setAddress} mode="outlined" style={styles.input} left={<TextInput.Icon icon="map-marker-outline" />} />

              <View style={styles.editActionRow}>
                <Button mode="outlined" onPress={() => setEditing(false)} style={styles.editActionButton}>{translate(language, "cancelButton")}</Button>
                <Button mode="contained" onPress={handleSaveProfile} loading={saving} style={styles.editActionButton}>{translate(language, "saveButton")}</Button>
              </View>
            </Card.Content>
          </Card>
          </Animated.View>
        ) : null}

        <View style={[styles.tabBar, { backgroundColor: theme.colors.surfaceVariant }]}> 
          {profileTabs.map((tab) => {
            const selected = activeTab === tab;
            return (
              <Pressable
                key={tab}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                onPress={() => setActiveTab(tab)}
                style={[styles.tabButton, selected && { backgroundColor: theme.colors.surface, elevation: 2 }]}
              >
                <Text style={[styles.tabButtonText, { color: selected ? theme.colors.primary : theme.colors.onSurfaceVariant }]}>{tab}</Text>
              </Pressable>
            );
          })}
        </View>

        {activeTab === "Account" && (
          <Animated.View entering={FadeIn.duration(220)} key="account-tab">
            <Card style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}> 
              <Card.Content>
                <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]}>Contact Information</Text>
                <List.Item title="Email" description={session.email} left={(props) => <List.Icon {...props} icon="email-outline" />} />
                <List.Item title="Phone" description={state.user.phone || "Not provided"} left={(props) => <List.Icon {...props} icon="phone-outline" />} />
                <List.Item title="Store Address" description={state.user.address || "Not provided"} left={(props) => <List.Icon {...props} icon="map-marker-outline" />} />
              </Card.Content>
            </Card>

            <Card style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}> 
              <Card.Content>
                <Text style={styles.overline}>DATA MANAGEMENT</Text>
                <List.Item title="Export Inventory Data" description="Save as Excel (.csv) or Word (.doc)" left={(props) => <List.Icon {...props} icon="download-outline" />} right={(props) => <List.Icon {...props} icon="chevron-right" />} onPress={() => setExportDialog("inventory")} />
                <List.Item title="Print Stock Report" description="Generate printable report" left={(props) => <List.Icon {...props} icon="printer-outline" />} right={(props) => <List.Icon {...props} icon="chevron-right" />} onPress={() => printInventoryData(state)} />
                <List.Item title="Sync Data Now" description="Last synced: just now" left={(props) => <List.Icon {...props} icon="sync" />} right={(props) => <List.Icon {...props} icon="chevron-right" />} onPress={() => handleDataAction("sync")} />
                <List.Item title="Clear Activity Log" description="Remove all activity history" titleStyle={{ color: theme.colors.error }} left={(props) => <List.Icon {...props} icon="delete-outline" color={theme.colors.error} />} right={(props) => <List.Icon {...props} icon="chevron-right" />} onPress={() => handleDataAction("clear")} />
              </Card.Content>
            </Card>

            <Card style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}> 
              <Card.Content>
                <List.Item title={translate(language, "settingsTitle")} description="Manage app preferences and security" left={(props) => <List.Icon {...props} icon="cog-outline" />} right={(props) => <List.Icon {...props} icon="chevron-right" />} onPress={() => router.push("/settings")} />
              </Card.Content>
            </Card>

            <Card style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}> 
              <Card.Content>
                <InfoRow label="App Version" value="v1.1.0" theme={theme} />
                <InfoRow label="Store ID" value="FM-2024-001" theme={theme} />
                <InfoRow label="License" value="Active" theme={theme} last />
              </Card.Content>
            </Card>

          </Animated.View>
        )}

        {activeTab === "Store" && (
          <Animated.View entering={FadeIn.duration(220)} key="store-tab">
            <Card style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}> 
              <Card.Content>
                <View style={styles.storeHeading}>
                  <View style={[styles.storeIcon, { backgroundColor: theme.colors.secondary }]}><List.Icon icon="store-outline" /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.storeName, { color: theme.colors.onSurface }]}>{storeName}</Text>
                    <Text style={[styles.helperText, { color: theme.colors.onSurfaceVariant }]}>{storeName ? "Store information" : "Set up your store information"}</Text>
                    <Chip compact icon="check-circle" style={[styles.statusChip, { backgroundColor: theme.colors.secondaryContainer }]} textStyle={{ color: theme.colors.onSecondaryContainer }}>Operational</Chip>
                  </View>
                </View>
                <InfoRow label="Store Address" value={storeAddress} theme={theme} />
                <InfoRow label="Contact Number" value={storePhone} theme={theme} />
                <InfoRow label="Email" value={storeEmail} theme={theme} />
                <InfoRow label="Business Hours" value={businessHours} theme={theme} />
                <InfoRow label="Business Permit No." value={permitNumber} theme={theme} last />
              </Card.Content>
            </Card>
            <Card style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}> 
              <Card.Content>
                <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]}>Inventory Health Score</Text>
                <View style={styles.healthRow}>
                  <View style={[styles.healthCircle, { borderColor: theme.colors.tertiary }]}><Text style={[styles.healthScore, { color: theme.colors.onSurface }]}>{state.products.length ? Math.round((summary.inStock / Math.max(summary.totalProducts, 1)) * 100) : 0}</Text><Text style={{ color: theme.colors.onSurfaceVariant }}>/ 100</Text></View>
                  <View style={{ flex: 1, gap: 10 }}>
                    <HealthMetric label="Stock Availability" value={state.products.length ? Math.round((summary.inStock / Math.max(summary.totalProducts, 1)) * 100) : 0} color={theme.colors.secondary} theme={theme} />
                    <HealthMetric label="Expiry Management" value={state.products.length ? 100 : 0} color={theme.colors.tertiary} theme={theme} />
                    <HealthMetric label="Reorder Compliance" value={state.products.length ? Math.round(((summary.totalProducts - summary.lowStock) / Math.max(summary.totalProducts, 1)) * 100) : 0} color={theme.colors.primary} theme={theme} />
                  </View>
                </View>
              </Card.Content>
            </Card>
            <Card style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}> 
              <Card.Content>
                <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]}>Categories Managed</Text>
                <View style={styles.categoryRow}>{Array.from(new Set(state.products.map((product) => product.category))).map((category) => <Chip key={category} compact style={[styles.categoryChip, { backgroundColor: theme.colors.secondaryContainer }]} textStyle={{ color: theme.colors.onSecondaryContainer }}>{category}</Chip>)}</View>
              </Card.Content>
            </Card>
            <Button icon="pencil-outline" mode="contained" onPress={() => setModal("store")} style={styles.fullButton}>Edit Store Information</Button>
          </Animated.View>
        )}

        {activeTab === "Team" && canViewTeam && (
          <Animated.View entering={FadeIn.duration(220)} key="team-tab">
          <Card style={[styles.card, styles.onlineBanner, { backgroundColor: theme.colors.secondary, borderColor: theme.colors.outline }]}> 
            <Card.Content><Text style={{ color: theme.colors.onSecondaryContainer, fontWeight: "600" }}>{employees.filter((employee) => employee.status === "Active").length} of {employees.length} Members Online</Text></Card.Content>
          </Card>
          <Card style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}> 
            <Card.Content>
              <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]}>{translate(language, "employeeManagementTitle")}</Text>
              <Text style={[styles.helperText, { color: theme.colors.onSurfaceVariant }]}>{translate(language, "employeeManagementDescription")}</Text>
              {isAdmin && <Button mode="contained" onPress={() => openEmployeeEditor()} style={styles.button}>{translate(language, "addEmployeeButton")}</Button>}

              {managerMode && (
                <Card style={[styles.innerCard, { backgroundColor: theme.colors.background, borderColor: theme.colors.outline }]}> 
                  <Card.Content>
                    <Text style={[styles.subTitle, { color: theme.colors.onSurface }]}>{managerMode === "add" ? translate(language, "addEmployeeTitle") : translate(language, "editEmployeeTitle")}</Text>
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

              {employees.length === 0 ? (
                <Text style={[styles.helperText, { color: theme.colors.onSurfaceVariant }]}>{translate(language, "noEmployeesMessage")}</Text>
              ) : (
                employees.map((employee) => (
                  <View key={employee.id} style={styles.employeeRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.employeeName, { color: theme.colors.onSurface }]}>{employee.name}</Text>
                      <Text style={[styles.employeeMeta, { color: theme.colors.onSurfaceVariant }]}>{employee.email} • {employee.role} • {employee.status}</Text>
                    </View>
                    {isAdmin && (
                      <View style={styles.employeeActions}>
                        <IconButton icon="pencil" size={20} onPress={() => openEmployeeEditor(employee)} />
                        <IconButton icon={employee.status === "Active" ? "account-cancel" : "account-check"} size={20} onPress={() => toggleEmployeeStatus(employee)} />
                        <IconButton icon="delete" size={20} onPress={() => handleRemoveEmployee(employee.id)} />
                      </View>
                    )}
                  </View>
                ))
              )}
            </Card.Content>
          </Card>
          <Card style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}> 
            <Card.Content>
              <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]}>Role Permissions</Text>
              {[["Admin", "Full Access", "User Management", "Reports", "Settings"], ["Editor", "Stock In/Out", "Add Products", "View Reports"], ["Viewer", "View Inventory", "View Reports"]].map(([role, ...permissions]) => <View key={role} style={styles.permissionBlock}><Text style={[styles.employeeName, { color: theme.colors.onSurface }]}>{role}</Text><View style={styles.categoryRow}>{permissions.map((permission) => <Chip key={permission} compact style={styles.categoryChip}>{permission}</Chip>)}</View></View>)}
            </Card.Content>
          </Card>
          </Animated.View>
        )}

        {activeTab === "Activity" && (
          <Animated.View entering={FadeIn.duration(220)} key="activity-tab">
          <Card style={[styles.card, styles.onlineBanner, { backgroundColor: theme.colors.secondaryContainer, borderColor: theme.colors.outline }]}> 
            <Card.Content style={styles.activityBannerContent}><Text style={{ color: theme.colors.onSecondaryContainer, fontWeight: "700" }}>Your Recent Activity</Text><Button compact textColor={theme.colors.onSecondaryContainer} onPress={() => setExportDialog("activity")}>Export Log</Button></Card.Content>
          </Card>
          <Card style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}> 
            <Card.Content>
              <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]}>{translate(language, "recentActivityTitle")}</Text>
              {state.movements.slice(0, 8).map((movement) => (
                <List.Item
                  key={movement.id}
                  title={`${movement.type === "in" ? "Stock In" : "Stock Out"} · ${movement.quantity} units`}
                  description={new Date(movement.timestamp).toLocaleDateString()}
                  left={() => <View style={[styles.activityArrow, { backgroundColor: `${theme.colors.primary}16` }]}><MaterialCommunityIcons name={movement.type === "in" ? "arrow-top-right" : "arrow-bottom-right"} size={18} color={movement.type === "in" ? theme.colors.primary : theme.colors.secondary} /></View>}
                />
              ))}
            </Card.Content>
          </Card>
          <Card style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}> 
            <Card.Content>
              <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]}>This Month's Usage</Text>
              {[
                ['Stock Ins Recorded', String(monthlyStockIns), 'arrow-up-bold'],
                ['Stock Outs Recorded', String(monthlyStockOuts), 'arrow-down-bold'],
                ['Low Stock Resolved', String(state.notifications.filter((notification) => notification.type === 'low_stock' && notification.isRead && notification.createdAt.slice(0, 7) === currentMonth).length), 'alert-outline'],
                ['Expiry Alerts Acted', String(monthlyExpiryAlerts), 'calendar-check'],
                ['Reports Generated', '0', 'chart-line'],
              ].map(([label, value, icon]) => <List.Item key={label} title={label} right={() => <Text style={styles.usageValue}>{value}</Text>} left={(props) => <List.Icon {...props} icon={icon} />} />)}
            </Card.Content>
          </Card>
          </Animated.View>
        )}
      </ScrollView>
      </KeyboardAvoidingView>

      <Portal>
        <Modal visible={modal === "store"} onDismiss={() => setModal(null)} contentContainerStyle={[styles.modal, { backgroundColor: theme.colors.surface, marginBottom: keyboardOffset, maxHeight: Math.min(Dimensions.get("window").height * 0.88, Dimensions.get("window").height - keyboardOffset - 40) }]}>
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderTitleRow}>
              <View style={[styles.editHeaderIcon, { backgroundColor: theme.colors.primaryContainer }]}>
                <IconButton icon="store-edit-outline" size={20} iconColor={theme.colors.primary} style={{ margin: 0 }} />
              </View>
              <Text style={[styles.cardTitle, { color: theme.colors.onSurface, marginBottom: 0 }]}>Edit Store Information</Text>
            </View>
            <IconButton icon="close" onPress={() => setModal(null)} />
          </View>
          <ScrollView showsVerticalScrollIndicator={false} style={styles.modalScroll} keyboardShouldPersistTaps="handled">
            <TextInput label="Store Name" value={storeName} onChangeText={setStoreName} mode="outlined" style={styles.input} left={<TextInput.Icon icon="storefront-outline" />} />
            <TextInput label="Address" value={storeAddress} onChangeText={setStoreAddress} mode="outlined" style={styles.input} left={<TextInput.Icon icon="map-marker-outline" />} />
            <TextInput label="Phone" value={storePhone} onChangeText={setStorePhone} mode="outlined" style={styles.input} left={<TextInput.Icon icon="phone-outline" />} />
            <TextInput label="Email" value={storeEmail} onChangeText={setStoreEmail} mode="outlined" style={styles.input} left={<TextInput.Icon icon="email-outline" />} />
            <TextInput label="Business Hours" value={businessHours} onChangeText={setBusinessHours} mode="outlined" style={styles.input} left={<TextInput.Icon icon="clock-outline" />} />
            <TextInput label="Business Permit No." value={permitNumber} onChangeText={setPermitNumber} mode="outlined" style={styles.input} left={<TextInput.Icon icon="certificate-outline" />} />
          </ScrollView>
          <View style={styles.editActionRow}>
            <Button mode="outlined" onPress={() => setModal(null)} style={styles.editActionButton}>{translate(language, "cancelButton")}</Button>
            <Button mode="contained" onPress={saveStoreInformation} style={styles.editActionButton}>Save Changes</Button>
          </View>
        </Modal>
      </Portal>
      <ExportFormatDialog
        visible={exportDialog === "inventory"}
        title="Export Inventory Data"
        onDismiss={() => setExportDialog(null)}
        onSelectExcel={() => downloadInventoryExcel(state)}
        onSelectWord={() => downloadInventoryWord(state)}
      />
      <ExportFormatDialog
        visible={exportDialog === "activity"}
        title="Export Activity Log"
        onDismiss={() => setExportDialog(null)}
        onSelectExcel={() => downloadActivityLogExcel(state)}
        onSelectWord={() => downloadActivityLogWord(state)}
      />
    </ScreenContainer>
  );
}

function MetricCard({ label, value, accent, theme }: { label: string; value: string; accent: string; theme: any }) {
  return (
    <View style={[styles.metricItem, { backgroundColor: theme.dark ? "rgba(48, 62, 112, 0.62)" : "rgba(225, 233, 255, 0.46)", borderColor: theme.dark ? "rgba(161, 180, 255, 0.2)" : "rgba(245, 248, 255, 0.58)" }]}>
      <Text style={[styles.metricValue, { color: accent }]}>{value}</Text>
      <Text style={[styles.metricLabel, { color: theme.dark ? theme.colors.onSurfaceVariant : "#43519a" }]}>{label}</Text>
    </View>
  );
}

function InfoRow({ label, value, theme, last = false }: { label: string; value: string; theme: any; last?: boolean }) {
  return <View style={[styles.infoRow, !last && { borderBottomWidth: 1, borderBottomColor: theme.colors.outline }]}><Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 12 }}>{label}</Text><Text style={[styles.infoValue, { color: theme.colors.onSurface }]}>{value}</Text></View>;
}

function HealthMetric({ label, value, color, theme }: { label: string; value: number; color: string; theme: any }) {
  return <View><View style={styles.healthLabel}><Text style={[styles.smallText, { color: theme.colors.onSurfaceVariant }]}>{label}</Text><Text style={[styles.smallText, { color, fontWeight: "700" }]}>{value}%</Text></View><ProgressBar progress={value / 100} color={color} style={styles.progress} /></View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  form: { flex: 1 },
  scrollContent: { paddingBottom: 32 },
  screenContent: { padding: 16, paddingBottom: 32 },
  banner: {
    padding: 18,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    marginBottom: 18,
  },
  bannerTopRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatarButton: { borderRadius: 36, overflow: "hidden" },
  bannerTextWrap: { flex: 1 },
  nameText: { fontSize: 22, fontWeight: "800" },
  roleText: { marginTop: 2, fontSize: 13, opacity: 0.9 },
  metaText: { marginTop: 2, fontSize: 11, opacity: 0.8 },
  editIcon: { marginLeft: 6 },
  metricRow: { flexDirection: "row", gap: 10, marginTop: 18 },
  metricItem: { flex: 1, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 12, backgroundColor: "rgba(255,255,255,0.55)", borderWidth: 1, borderColor: "rgba(255,255,255,0.7)", alignItems: "center", justifyContent: "center" },
  metricValue: { fontSize: 18, fontWeight: "800", textAlign: "center" },
  metricLabel: { marginTop: 4, fontSize: 10, fontWeight: "600", textAlign: "center" },
  smallText: { fontSize: 10, color: "#64748b" },
  card: { borderRadius: 18, marginBottom: 14, borderWidth: 1, elevation: 1 },
  cardTitle: { fontSize: 16, fontWeight: "800", marginBottom: 12 },
  helperText: { marginBottom: 12, lineHeight: 20 },
  tabBar: { flexDirection: "row", height: 48, marginBottom: 14, padding: 4, borderRadius: 16, alignItems: "stretch", overflow: "hidden" },
  tabButton: { flex: 1, alignItems: "center", justifyContent: "center", borderRadius: 12, marginHorizontal: 2 },
  tabButtonText: { fontWeight: "700", fontSize: 12 },
  actionRow: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  actionButtonHalf: { flex: 1, minWidth: 120 },
  actionButtonLabel: { fontSize: 12 },
  button: { marginTop: 10 },
  input: { marginBottom: 16, backgroundColor: "transparent" },
  innerCard: { borderRadius: 16, borderWidth: 1, marginTop: 12 },
  subTitle: { fontSize: 15, fontWeight: "700", marginBottom: 10 },
  employeeRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "rgba(0,0,0,0.08)" },
  employeeName: { fontWeight: "700" },
  employeeMeta: { fontSize: 12, marginTop: 2 },
  employeeActions: { flexDirection: "row", alignItems: "center" },
  storeHeading: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 8 },
  storeIcon: { width: 56, height: 56, borderRadius: 16, justifyContent: "center", alignItems: "center" },
  storeName: { fontSize: 16, fontWeight: "800" },
  statusChip: { alignSelf: "flex-start" },
  infoRow: { minHeight: 40, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 9 },
  infoValue: { flex: 1, marginLeft: 16, textAlign: "right", fontSize: 12, fontWeight: "700" },
  healthRow: { flexDirection: "row", alignItems: "center", gap: 18 },
  healthCircle: { width: 88, height: 88, borderRadius: 44, borderWidth: 7, justifyContent: "center", alignItems: "center" },
  healthScore: { fontSize: 24, fontWeight: "800" },
  healthLabel: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  progress: { height: 6, borderRadius: 4 },
  categoryRow: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  categoryChip: {},
  fullButton: { marginBottom: 14 },
  onlineBanner: { borderRadius: 16 },
  activityBannerContent: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  activityArrow: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  permissionBlock: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "rgba(0,0,0,0.08)" },
  usageValue: { alignSelf: "center", fontWeight: "800", color: "#1d4ed8" },
  overline: { color: "#64748b", fontSize: 11, fontWeight: "800", letterSpacing: 1 },
  modal: { margin: 0, marginTop: "auto", padding: 20, borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  modalHeaderTitleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  modalScroll: { flexGrow: 0 },
  editCard: { borderRadius: 20, marginBottom: 14, borderWidth: 1, elevation: 1 },
  editHeaderRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 },
  editHeaderIcon: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  avatarEditRow: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 18 },
  avatarEditButton: { borderRadius: 32, overflow: "hidden" },
  avatarActionsCol: { flex: 1, gap: 8 },
  avatarActionButton: { borderRadius: 10 },
  avatarActionLabel: { fontSize: 12 },
  editActionRow: { flexDirection: "row", gap: 10, marginTop: 6 },
  editActionButton: { flex: 1, borderRadius: 12 },
});
