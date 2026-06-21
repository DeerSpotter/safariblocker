#import <Foundation/Foundation.h>
#import <CoreFoundation/CoreFoundation.h>
#import <UIKit/UIKit.h>
#import <objc/runtime.h>

#ifndef kCFCoreFoundationVersionNumber_iOS_14_0
#define kCFCoreFoundationVersionNumber_iOS_14_0 1751.108
#endif

typedef NS_ENUM(NSInteger, PSCellType) {
    PSGroupCell = 0,
    PSLinkCell = 1,
    PSLinkListCell = 2,
    PSListItemCell = 3,
    PSTitleValueCell = 4,
    PSSliderCell = 5,
    PSSwitchCell = 6,
    PSStaticTextCell = 7,
    PSEditTextCell = 8,
    PSSegmentCell = 9,
    PSButtonCell = 13,
};

@interface LSApplicationProxy : NSObject
+ (instancetype)applicationProxyForIdentifier:(NSString *)identifier;
- (NSURL *)containerURL;
@end

@interface PSSpecifier : NSObject
+ (instancetype)preferenceSpecifierNamed:(NSString *)name target:(id)target set:(SEL)set get:(SEL)get detail:(Class)detail cell:(PSCellType)cell edit:(Class)edit;
+ (instancetype)emptyGroupSpecifier;
- (void)setProperty:(id)value forKey:(NSString *)key;
- (id)propertyForKey:(NSString *)key;
@end

@interface PSListController : UIViewController <UITableViewDataSource, UITableViewDelegate> {
@protected
    NSMutableArray *_specifiers;
}
- (NSArray *)loadSpecifiersFromPlistName:(NSString *)plistName target:(id)target;
- (void)reloadSpecifiers;
- (void)pushController:(id)controller animate:(BOOL)animated;
@end

static NSString * const TBPreferenceChangedNotification = @"com.p2kdev.safariblocker.settingschanged";
static NSString * const TBPreferenceFileName = @"com.p2kdev.safariblocker.plist";

static NSString *TBPreferenceFilePath(void) {
    Class proxyClass = objc_getClass("LSApplicationProxy");
    if (proxyClass && [proxyClass respondsToSelector:@selector(applicationProxyForIdentifier:)]) {
        id proxy = [(id)proxyClass applicationProxyForIdentifier:@"com.apple.mobilesafari"];
        if (proxy && [proxy respondsToSelector:@selector(containerURL)]) {
            NSURL *containerURL = [(LSApplicationProxy *)proxy containerURL];
            if (containerURL.path.length > 0) {
                return [[containerURL.path stringByAppendingPathComponent:@"Library/Preferences"] stringByAppendingPathComponent:TBPreferenceFileName];
            }
        }
    }

    return [@"/var/mobile/Library/Preferences" stringByAppendingPathComponent:TBPreferenceFileName];
}

static NSMutableDictionary *TBMutablePreferences(void) {
    NSDictionary *existing = [NSDictionary dictionaryWithContentsOfFile:TBPreferenceFilePath()];
    if ([existing isKindOfClass:[NSDictionary class]]) {
        return [existing mutableCopy];
    }
    return [NSMutableDictionary dictionary];
}

static void TBWritePreferences(NSMutableDictionary *preferences) {
    NSString *path = TBPreferenceFilePath();
    [[NSFileManager defaultManager] createDirectoryAtPath:[path stringByDeletingLastPathComponent]
                              withIntermediateDirectories:YES
                                               attributes:nil
                                                    error:nil];
    [preferences writeToFile:path atomically:YES];
    CFNotificationCenterPostNotification(CFNotificationCenterGetDarwinNotifyCenter(), (__bridge CFStringRef)TBPreferenceChangedNotification, NULL, NULL, YES);
}

static NSString *TBTrimmedEntry(NSString *entry) {
    if (![entry isKindOfClass:[NSString class]]) {
        return @"";
    }
    return [entry stringByTrimmingCharactersInSet:[NSCharacterSet whitespaceAndNewlineCharacterSet]];
}

static NSArray<NSString *> *TBListPreferenceKeys(void) {
    return @[@"allowedDomains", @"blockedDomains", @"blockedURLs"];
}

static NSMutableArray<NSString *> *TBEntriesFromValue(id value) {
    NSMutableArray<NSString *> *entries = [NSMutableArray array];

    if ([value isKindOfClass:[NSArray class]]) {
        for (id item in (NSArray *)value) {
            NSString *entry = TBTrimmedEntry(item);
            if (entry.length > 0 && ![entries containsObject:entry]) {
                [entries addObject:entry];
            }
        }
    } else if ([value isKindOfClass:[NSString class]]) {
        for (NSString *item in [(NSString *)value componentsSeparatedByString:@";"]) {
            NSString *entry = TBTrimmedEntry(item);
            if (entry.length > 0 && ![entries containsObject:entry]) {
                [entries addObject:entry];
            }
        }
    }

    return entries;
}

static NSMutableArray<NSString *> *TBEntriesForKey(NSString *key) {
    return TBEntriesFromValue([TBMutablePreferences() objectForKey:key]);
}

static NSString *TBDateStringForFormat(NSString *format) {
    NSDateFormatter *formatter = [[NSDateFormatter alloc] init];
    formatter.locale = [NSLocale localeWithLocaleIdentifier:@"en_US_POSIX"];
    formatter.dateFormat = format;
    return [formatter stringFromDate:[NSDate date]];
}

static NSString *TBBackupDisplayNameForKey(NSString *key) {
    if ([key isEqualToString:@"allowedDomains"]) {
        return @"whitelisted domains";
    }
    if ([key isEqualToString:@"blockedDomains"]) {
        return @"blocked domains";
    }
    return @"blocked URLs";
}

static void TBPresentAlert(UIViewController *controller, NSString *title, NSString *message) {
    UIAlertController *alert = [UIAlertController alertControllerWithTitle:title
                                                                   message:message
                                                            preferredStyle:UIAlertControllerStyleAlert];
    [alert addAction:[UIAlertAction actionWithTitle:@"OK" style:UIAlertActionStyleDefault handler:nil]];
    [controller presentViewController:alert animated:YES completion:nil];
}

@interface TBGeneralListController : PSListController
@property (nonatomic, strong) NSMutableArray<NSString *> *dataList;
@property (nonatomic, copy) NSString *dataListKey;
@property (nonatomic, copy) NSString *pageTitle;
@property (nonatomic, copy) NSString *entryPrompt;
@property (nonatomic, copy) NSString *entryPlaceholder;
- (instancetype)initForType:(NSInteger)type;
@end

@interface TBRootListController : PSListController <UIDocumentPickerDelegate>
@end

@implementation TBRootListController

- (instancetype)init {
    self = [super init];
    return self;
}

- (NSArray *)specifiers {
    if (!_specifiers) {
        _specifiers = [[self loadSpecifiersFromPlistName:@"Root" target:self] mutableCopy];
    }
    return _specifiers;
}

- (void)launchAllowedDomainOptions {
    TBGeneralListController *controller = [[TBGeneralListController alloc] initForType:0];
    [self pushController:controller animate:YES];
}

- (void)launchBlockedDomainOptions {
    TBGeneralListController *controller = [[TBGeneralListController alloc] initForType:1];
    [self pushController:controller animate:YES];
}

- (void)launchBlockedURLOptions {
    TBGeneralListController *controller = [[TBGeneralListController alloc] initForType:2];
    [self pushController:controller animate:YES];
}

- (id)readPreferenceValue:(PSSpecifier *)specifier {
    NSString *key = [specifier propertyForKey:@"key"];
    id defaultValue = [specifier propertyForKey:@"default"];
    id value = [TBMutablePreferences() objectForKey:key];
    return value ?: defaultValue ?: @NO;
}

- (void)setPreferenceValue:(id)value specifier:(PSSpecifier *)specifier {
    NSString *key = [specifier propertyForKey:@"key"];
    if (!key) {
        return;
    }

    NSMutableDictionary *preferences = TBMutablePreferences();
    if (value) {
        [preferences setObject:value forKey:key];
    } else {
        [preferences removeObjectForKey:key];
    }
    TBWritePreferences(preferences);
}

- (NSDictionary *)currentListBackupDictionary {
    NSMutableDictionary *lists = [NSMutableDictionary dictionary];
    NSMutableDictionary *preferences = TBMutablePreferences();

    for (NSString *key in TBListPreferenceKeys()) {
        [lists setObject:TBEntriesFromValue([preferences objectForKey:key]) forKey:key];
    }

    return @{
        @"format" : @"SafariBlockerListBackup",
        @"version" : @1,
        @"exportedAt" : TBDateStringForFormat(@"yyyy-MM-dd'T'HH:mm:ssZZZZZ"),
        @"lists" : lists
    };
}

- (void)exportListBackup {
    NSError *error = nil;
    NSData *jsonData = [NSJSONSerialization dataWithJSONObject:[self currentListBackupDictionary]
                                                       options:NSJSONWritingPrettyPrinted
                                                         error:&error];
    if (!jsonData) {
        TBPresentAlert(self, @"Export Failed", error.localizedDescription ?: @"Unable to create the backup file.");
        return;
    }

    NSString *fileName = [NSString stringWithFormat:@"SafariBlocker-Lists-%@.json", TBDateStringForFormat(@"yyyyMMdd-HHmmss")];
    NSString *filePath = [NSTemporaryDirectory() stringByAppendingPathComponent:fileName];
    if (![jsonData writeToFile:filePath options:NSDataWritingAtomic error:&error]) {
        TBPresentAlert(self, @"Export Failed", error.localizedDescription ?: @"Unable to write the backup file.");
        return;
    }

    NSURL *fileURL = [NSURL fileURLWithPath:filePath];
    UIActivityViewController *activityController = [[UIActivityViewController alloc] initWithActivityItems:@[fileURL]
                                                                                    applicationActivities:nil];
    if (activityController.popoverPresentationController) {
        activityController.popoverPresentationController.sourceView = self.view;
        activityController.popoverPresentationController.sourceRect = CGRectMake(CGRectGetMidX(self.view.bounds), CGRectGetMidY(self.view.bounds), 1, 1);
        activityController.popoverPresentationController.permittedArrowDirections = 0;
    }

    [self presentViewController:activityController animated:YES completion:nil];
}

- (void)importListBackup {
    UIDocumentPickerViewController *picker = [[UIDocumentPickerViewController alloc] initWithDocumentTypes:@[@"public.json", @"public.text", @"public.data"]
                                                                                                    inMode:UIDocumentPickerModeImport];
    picker.delegate = self;
    picker.modalPresentationStyle = UIModalPresentationFormSheet;
    [self presentViewController:picker animated:YES completion:nil];
}

- (void)documentPicker:(UIDocumentPickerViewController *)controller didPickDocumentsAtURLs:(NSArray<NSURL *> *)urls {
    NSURL *fileURL = urls.firstObject;
    if (!fileURL) {
        return;
    }

    [self importListBackupFromURL:fileURL];
}

- (void)documentPickerWasCancelled:(UIDocumentPickerViewController *)controller {
}

- (void)importListBackupFromURL:(NSURL *)fileURL {
    BOOL startedAccess = [fileURL startAccessingSecurityScopedResource];
    NSError *error = nil;
    NSData *data = [NSData dataWithContentsOfURL:fileURL options:0 error:&error];
    if (startedAccess) {
        [fileURL stopAccessingSecurityScopedResource];
    }

    if (!data) {
        TBPresentAlert(self, @"Import Failed", error.localizedDescription ?: @"Unable to read the backup file.");
        return;
    }

    id jsonObject = [NSJSONSerialization JSONObjectWithData:data options:0 error:&error];
    if (![jsonObject isKindOfClass:[NSDictionary class]]) {
        TBPresentAlert(self, @"Import Failed", @"The selected file is not a SafariBlocker list backup.");
        return;
    }

    NSDictionary *backup = (NSDictionary *)jsonObject;
    id listsObject = [backup objectForKey:@"lists"];
    NSDictionary *lists = [listsObject isKindOfClass:[NSDictionary class]] ? (NSDictionary *)listsObject : backup;
    NSMutableDictionary *preferences = TBMutablePreferences();
    NSMutableArray<NSString *> *summaryLines = [NSMutableArray array];
    BOOL importedAnyList = NO;

    for (NSString *key in TBListPreferenceKeys()) {
        id value = [lists objectForKey:key];
        if (!value || value == [NSNull null]) {
            continue;
        }

        NSMutableArray<NSString *> *entries = TBEntriesFromValue(value);
        [preferences setObject:[entries componentsJoinedByString:@";"] forKey:key];
        [summaryLines addObject:[NSString stringWithFormat:@"%lu %@", (unsigned long)entries.count, TBBackupDisplayNameForKey(key)]];
        importedAnyList = YES;
    }

    if (!importedAnyList) {
        TBPresentAlert(self, @"Import Failed", @"The backup file did not contain allowedDomains, blockedDomains, or blockedURLs.");
        return;
    }

    TBWritePreferences(preferences);
    _specifiers = nil;
    [self reloadSpecifiers];

    NSString *message = [NSString stringWithFormat:@"Imported %@.", [summaryLines componentsJoinedByString:@", "]];
    TBPresentAlert(self, @"Import Complete", message);
}

- (void)visitTwitter {
    NSURL *url = [NSURL URLWithString:@"http://twitter.com/p2kdev"];
    if ([[UIApplication sharedApplication] respondsToSelector:@selector(openURL:options:completionHandler:)]) {
        [[UIApplication sharedApplication] openURL:url options:@{} completionHandler:nil];
    } else {
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdeprecated-declarations"
        [[UIApplication sharedApplication] openURL:url];
#pragma clang diagnostic pop
    }
}

@end

@implementation TBGeneralListController

- (instancetype)initForType:(NSInteger)type {
    self = [super init];
    if (!self) {
        return nil;
    }

    if (type == 0) {
        self.dataListKey = @"allowedDomains";
        self.pageTitle = @"Whitelisted Domains";
        self.entryPrompt = @"Enter a domain to whitelist.";
        self.entryPlaceholder = @"example.com";
    } else if (type == 1) {
        self.dataListKey = @"blockedDomains";
        self.pageTitle = @"Blocked Domains";
        self.entryPrompt = @"Enter a domain to block.";
        self.entryPlaceholder = @"example.com";
    } else {
        self.dataListKey = @"blockedURLs";
        self.pageTitle = @"Blocked URLs";
        self.entryPrompt = @"Enter a URL to block.";
        self.entryPlaceholder = @"https://example.com/path";
    }

    self.dataList = TBEntriesForKey(self.dataListKey);
    self.title = self.pageTitle;
    return self;
}

- (void)viewDidLoad {
    [super viewDidLoad];
    self.title = self.pageTitle;
    self.navigationItem.rightBarButtonItem = [[UIBarButtonItem alloc] initWithBarButtonSystemItem:UIBarButtonSystemItemAdd
                                                                                           target:self
                                                                                           action:@selector(addEntryTapped)];
}

- (NSArray *)specifiers {
    if (!_specifiers) {
        _specifiers = [NSMutableArray array];

        PSSpecifier *group = [PSSpecifier emptyGroupSpecifier];
        [group setProperty:@"Press + to add an entry. Swipe left on an entry to delete it." forKey:@"footerText"];
        [_specifiers addObject:group];

        for (NSString *entry in self.dataList) {
            PSSpecifier *specifier = [PSSpecifier preferenceSpecifierNamed:entry
                                                                    target:self
                                                                       set:nil
                                                                       get:nil
                                                                    detail:nil
                                                                      cell:PSStaticTextCell
                                                                      edit:nil];
            [specifier setProperty:entry forKey:@"label"];
            [specifier setProperty:entry forKey:@"value"];
            [_specifiers addObject:specifier];
        }
    }

    return _specifiers;
}

- (void)addEntryTapped {
    UIAlertController *alert = [UIAlertController alertControllerWithTitle:@"Add Entry"
                                                                   message:self.entryPrompt
                                                            preferredStyle:UIAlertControllerStyleAlert];

    __weak typeof(self) weakSelf = self;
    [alert addTextFieldWithConfigurationHandler:^(UITextField *textField) {
        textField.placeholder = weakSelf.entryPlaceholder;
        textField.autocapitalizationType = UITextAutocapitalizationTypeNone;
        textField.autocorrectionType = UITextAutocorrectionTypeNo;
        textField.keyboardType = UIKeyboardTypeURL;
        textField.clearButtonMode = UITextFieldViewModeWhileEditing;
    }];

    [alert addAction:[UIAlertAction actionWithTitle:@"Cancel" style:UIAlertActionStyleCancel handler:nil]];
    [alert addAction:[UIAlertAction actionWithTitle:@"Submit" style:UIAlertActionStyleDefault handler:^(UIAlertAction *action) {
        __strong typeof(weakSelf) strongSelf = weakSelf;
        if (!strongSelf) {
            return;
        }

        UITextField *textField = alert.textFields.firstObject;
        [strongSelf addEntryFromString:textField.text];
    }]];

    [self presentViewController:alert animated:YES completion:nil];
}

- (void)addEntryFromString:(NSString *)entryString {
    NSString *entry = TBTrimmedEntry(entryString);
    if (entry.length == 0) {
        return;
    }

    if (![self.dataList containsObject:entry]) {
        [self.dataList addObject:entry];
        [self saveEntriesAndReload];
    }
}

- (void)saveEntriesAndReload {
    NSMutableDictionary *preferences = TBMutablePreferences();
    NSString *joined = [self.dataList componentsJoinedByString:@";"];
    [preferences setObject:joined forKey:self.dataListKey];
    TBWritePreferences(preferences);

    _specifiers = nil;
    [self reloadSpecifiers];
}

- (BOOL)tableView:(UITableView *)tableView canEditRowAtIndexPath:(NSIndexPath *)indexPath {
    return indexPath.section == 0 && indexPath.row < self.dataList.count;
}

- (void)tableView:(UITableView *)tableView commitEditingStyle:(UITableViewCellEditingStyle)editingStyle forRowAtIndexPath:(NSIndexPath *)indexPath {
    if (editingStyle != UITableViewCellEditingStyleDelete || indexPath.row >= self.dataList.count) {
        return;
    }

    [self.dataList removeObjectAtIndex:indexPath.row];
    [self saveEntriesAndReload];
}

@end
