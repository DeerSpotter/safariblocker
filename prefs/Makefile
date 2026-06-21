ARCHS = arm64 arm64e
TARGET := iphone:clang:latest:15.0
THEOS_PACKAGE_SCHEME = rootless

include $(THEOS)/makefiles/common.mk

BUNDLE_NAME = SafariBlocker
SafariBlocker_FILES = TBRootListController.m
SafariBlocker_FRAMEWORKS = UIKit CoreFoundation
SafariBlocker_PRIVATE_FRAMEWORKS = Preferences
SafariBlocker_INSTALL_PATH = /Library/PreferenceBundles
SafariBlocker_CFLAGS = -fobjc-arc

include $(THEOS_MAKE_PATH)/bundle.mk
