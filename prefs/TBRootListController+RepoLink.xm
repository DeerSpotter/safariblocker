#import <UIKit/UIKit.h>
#import <objc/runtime.h>

@interface TBRootListController : NSObject
- (void)visitTwitter;
@end

@implementation TBRootListController (RepoLink)

+ (void)load {
    Method originalMethod = class_getInstanceMethod(self, @selector(visitTwitter));
    Method replacementMethod = class_getInstanceMethod(self, @selector(ds_visitTwitter));

    if (originalMethod && replacementMethod) {
        method_exchangeImplementations(originalMethod, replacementMethod);
    }
}

- (void)ds_visitTwitter {
    NSURL *url = [NSURL URLWithString:@"https://github.com/DeerSpotter/safariblocker"];
    UIApplication *application = [UIApplication sharedApplication];

    if ([application respondsToSelector:@selector(openURL:options:completionHandler:)]) {
        [application openURL:url options:@{} completionHandler:nil];
    } else {
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wdeprecated-declarations"
        [application openURL:url];
#pragma clang diagnostic pop
    }
}

@end
