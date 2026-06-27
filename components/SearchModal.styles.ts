import { Platform, StyleSheet } from "react-native";
import { COLORS } from "@/lib/types";

export const searchModalStyles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: Platform.OS === "web" ? "center" : "flex-end",
    alignItems: Platform.OS === "web" ? "center" : "stretch",
  },

  modalCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    width: Platform.OS === "web" ? 420 : "100%",
    maxHeight: "80%",
    gap: 10,
  },

  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  addNewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: COLORS.primaryLight,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  addNewBtnText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  customerOptionSubText: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 2,
  },
  
  modalTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.text,
  },

  modalCloseBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: COLORS.gray50,
    alignItems: "center",
    justifyContent: "center",
  },

  modalSearchInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    height: 42,
    paddingHorizontal: 12,
    fontSize: 14,
    color: COLORS.text,
    backgroundColor: COLORS.gray50,
  },

  customerList: {
    maxHeight: 350,
  },

  customerOption: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
  },

  customerOptionActive: {
    backgroundColor: COLORS.primary,
  },

  customerOptionText: {
    fontSize: 14,
    color: COLORS.text,
  },

  customerOptionTextActive: {
    color: COLORS.white,
    fontWeight: "700",
  },

  customerListEmpty: {
    textAlign: "center",
    paddingVertical: 20,
    color: COLORS.textLight,
  },
});