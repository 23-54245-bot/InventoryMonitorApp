import React from "react";
import { StyleSheet, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import {
  Avatar,
  Button,
  Card,
  Chip,
  Divider,
  IconButton,
  Text,
  TextInput,
  type MD3Theme,
} from "react-native-paper";

import type { Employee, EmployeeStatus, UserRole } from "../../context/auth";
import type { AppLanguage } from "../../lib/i18n";
import { translate } from "../../lib/i18n";

const roleOptions: UserRole[] = ["Admin", "Manager", "Staff"];

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

interface EmployeeForm {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: EmployeeStatus;
}

interface Props {
  employees: Employee[];
  isAdmin: boolean;
  managerMode: "add" | "edit" | null;
  employeeForm: EmployeeForm;
  employeeMessage: string | null;
  setManagerMode: (mode: "add" | "edit" | null) => void;
  setEmployeeForm: React.Dispatch<React.SetStateAction<EmployeeForm>>;
  setEmployeeMessage: (msg: string | null) => void;
  onSave: () => Promise<void>;
  onRemove: (id: string) => Promise<void>;
  onToggleStatus: (employee: Employee) => Promise<void>;
  onOpenEditor: (employee?: Employee) => void;
  onResetEditor: () => void;
  language: AppLanguage;
  theme: MD3Theme;
}

export function ProfileTeamSection({
  employees,
  isAdmin,
  managerMode,
  employeeForm,
  employeeMessage,
  setEmployeeForm,
  onSave,
  onRemove,
  onToggleStatus,
  onOpenEditor,
  onResetEditor,
  language,
  theme,
}: Props) {
  return (
    <Animated.View entering={FadeIn.duration(200)} key="team-tab">
      <Text style={[styles.groupHeader, { color: theme.colors.onSurfaceVariant }]}>
        TEAM MEMBERS ({employees.length})
      </Text>

      <View style={[styles.groupContainer, { backgroundColor: theme.colors.surface }]}>
        {employees.length === 0 ? (
          <View style={styles.rowInner}>
            <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 13 }}>
              {translate(language, "noEmployeesYet") || "No employees added yet."}
            </Text>
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
                  <Text numberOfLines={1} style={[styles.rowTitle, { color: theme.colors.onSurface }]}>
                    {employee.name}
                  </Text>
                  <Text
                    numberOfLines={1}
                    ellipsizeMode="tail"
                    style={[styles.rowSubtitle, { color: theme.colors.onSurfaceVariant }]}
                  >
                    {employee.email}
                  </Text>
                </View>
                <Chip
                  compact
                  style={{ backgroundColor: theme.colors.surfaceVariant, marginRight: 4 }}
                  textStyle={{ color: theme.colors.primary, fontSize: 11, fontWeight: "600" }}
                >
                  {employee.role}
                </Chip>
                {isAdmin ? (
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <IconButton icon="pencil-outline" size={18} onPress={() => onOpenEditor(employee)} />
                    <IconButton
                      icon={employee.status === "Active" ? "account-cancel-outline" : "account-check-outline"}
                      size={18}
                      onPress={() => onToggleStatus(employee)}
                    />
                    <IconButton
                      icon="delete-outline"
                      size={18}
                      iconColor={theme.colors.error}
                      onPress={() => onRemove(employee.id)}
                    />
                  </View>
                ) : null}
              </View>
            </View>
          ))
        )}
      </View>

      {isAdmin ? (
        <Button
          mode="contained"
          icon="account-plus-outline"
          buttonColor={theme.colors.primary}
          onPress={() => onOpenEditor()}
          style={{ marginTop: 14, borderRadius: 16 }}
        >
          {translate(language, "addTeamMember") || "Add Team Member"}
        </Button>
      ) : null}

      {managerMode ? (
        <Card
          style={[
            styles.innerCard,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline, marginTop: 14 },
          ]}
        >
          <Card.Content>
            <Text style={[styles.subTitle, { color: theme.colors.onSurface }]}>
              {managerMode === "add"
                ? translate(language, "addEmployeeTitle")
                : translate(language, "editEmployeeTitle")}
            </Text>
            <TextInput
              label={translate(language, "nameLabel")}
              value={employeeForm.name}
              onChangeText={(text) => setEmployeeForm((prev) => ({ ...prev, name: text }))}
              mode="outlined"
              style={styles.input}
            />
            <TextInput
              label={translate(language, "emailLabel")}
              value={employeeForm.email}
              onChangeText={(text) => setEmployeeForm((prev) => ({ ...prev, email: text }))}
              mode="outlined"
              style={styles.input}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <View style={[styles.actionRow, styles.button]}>
              <Button
                mode="outlined"
                onPress={() =>
                  setEmployeeForm((prev) => ({
                    ...prev,
                    role: roleOptions[(roleOptions.indexOf(prev.role) + 1) % roleOptions.length],
                  }))
                }
                style={styles.actionButtonHalf}
                labelStyle={styles.actionButtonLabel}
              >
                {translate(language, "roleLabel")}: {employeeForm.role}
              </Button>
              <Button
                mode="outlined"
                onPress={() =>
                  setEmployeeForm((prev) => ({
                    ...prev,
                    status: prev.status === "Active" ? "Inactive" : "Active",
                  }))
                }
                style={styles.actionButtonHalf}
                labelStyle={styles.actionButtonLabel}
              >
                {translate(language, "statusLabel")}: {employeeForm.status}
              </Button>
            </View>
            {employeeMessage ? (
              <Text style={[styles.helperText, { color: theme.colors.error }]}>{employeeMessage}</Text>
            ) : null}
            <View style={[styles.actionRow, styles.button]}>
              <Button mode="contained" onPress={onSave} style={styles.actionButtonHalf}>
                {translate(language, "saveButton")}
              </Button>
              <Button mode="outlined" onPress={onResetEditor} style={styles.actionButtonHalf}>
                {translate(language, "cancelButton")}
              </Button>
            </View>
          </Card.Content>
        </Card>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  groupHeader: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1.1,
    textTransform: "uppercase",
    marginBottom: 6,
    marginLeft: 4,
    marginTop: 14,
  },
  groupContainer: { borderRadius: 16, overflow: "hidden", marginBottom: 6 },
  rowInner: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  rowIconWrap: { width: 28, alignItems: "flex-start" },
  rowTextWrap: { flex: 1, justifyContent: "center" },
  rowTitle: { fontSize: 15, fontWeight: "500" },
  rowSubtitle: { fontSize: 12, marginTop: 2 },
  innerCard: { borderRadius: 16, borderWidth: 1, marginTop: 12 },
  subTitle: { fontSize: 15, fontWeight: "600", marginBottom: 10 },
  input: { marginBottom: 14, backgroundColor: "transparent" },
  actionRow: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  actionButtonHalf: { flex: 1, minWidth: 120 },
  actionButtonLabel: { fontSize: 13 },
  button: { marginTop: 10 },
  helperText: { marginBottom: 12, lineHeight: 20 },
});
