#import <UIKit/UIKit.h>

@interface TBRootListController : NSObject
- (void)visitTwitter;
@end

@implementation TBRootListController (RepoLink)

- (void)visitTwitter {
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
