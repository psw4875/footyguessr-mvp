import {
  Container,
  Box,
  Button,
  Input,
  Heading,
  Text,
  VStack,
  FormControl,
  FormLabel,
  FormHelperText,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  useToast,
} from "@chakra-ui/react";
import MetaHead from "../components/MetaHead";
import { trackEvent } from "../lib/analytics";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";

export default function Home() {
  const router = useRouter();
  const [name, setName] = useState("");
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [modalName, setModalName] = useState("");
  const toast = useToast();

  const [dailyStatus, setDailyStatus] = useState({ played: false, score: null });

  useEffect(() => {
    try {
      // Use UTC date key for global consistency
      const dk = new Date().toISOString().slice(0, 10);
      const key = `fta_daily_${dk}`;
      const raw = localStorage.getItem(key);
      if (raw) setDailyStatus({ played: true, score: Number(raw) });
      else setDailyStatus({ played: false, score: null });
    } catch (e) {}
  }, []);

  // Load persisted nickname if any
  useEffect(() => {
    try {
      const stored = localStorage.getItem("fta_nick") || "";
      if (stored) setName(stored);
    } catch (e) {}
  }, []);

  const startSingle = () => {
    trackEvent("click_practice");
    router.push("/game?mode=single");
  };

  const startPvpLobby = () => {
    trackEvent("click_pvp");
    // Always open modal so nickname can be reviewed/edited before PvP
    try {
      const stored = (localStorage.getItem("fta_nick") || name || "").trim();
      setModalName(stored);
    } catch (e) {
      setModalName(name || "");
    }
    onOpen();
  };

  function handleConfirmModal() {
    const v = String(modalName || "").trim();
    if (!v) {
      toast({ title: "Nickname required", description: "Please enter a nickname to continue.", status: "warning", duration: 3000, isClosable: true });
      return;
    }
    try {
      localStorage.setItem("fta_nick", v);
    } catch (e) {}
    setName(v);
    onClose();
    router.push(`/game?mode=pvp&name=${encodeURIComponent(v)}`);
  }

  return (
    <>
      <MetaHead
        title="FootyGuessr: Guess Football Matches Quiz Game"
        description="Free online football quiz. Identify iconic matches from one photo. Play 60s solo mode, compete in 1v1 PvP battles, or join daily challenges. Test your soccer knowledge now!"
        url="https://footyguessr.io/"
      />
      <Container maxW="container.md" p={4}>
        <VStack spacing={6} align="stretch">
          <Box textAlign="center" mt={8}>
            <Heading as="h1" size="2xl" mb={3}>
              ⚽ FootyGuessr
            </Heading>
            <Text fontSize="lg" color="gray.800" fontWeight="600">
              Guess the match in one photo.
            </Text>
          </Box>

          {/* Daily Challenge: Primary CTA */}
        <Box p={5} borderWidth="2px" borderRadius="lg" bg={dailyStatus.played ? 'gray.50' : 'orange.50'} borderColor={dailyStatus.played ? 'gray.300' : 'orange.400'} boxShadow="md">
          <VStack spacing={3} align="stretch">
            <Heading size="lg" mb={0}>🔥 Daily Challenge</Heading>
            <Text fontSize="sm" color="gray.700">Same puzzle every day for everyone.</Text>
            <VStack align="start" spacing={1}>
              <Text fontSize="sm" color="gray.700" fontWeight="500">
                {dailyStatus.played ? '✓ Completed today' : 'Beat the global leaderboard'}
              </Text>
            </VStack>
            <Button 
              colorScheme={dailyStatus.played ? 'gray' : 'orange'} 
              w="100%" 
              size="lg" 
              onClick={() => {
                trackEvent("click_daily_challenge");
                router.push('/game?mode=single&daily=1');
              }}
              fontWeight="bold"
              fontSize="md"
              py={6}
              isDisabled={false}
            >
              {dailyStatus.played ? `✓ Completed (${dailyStatus.score ?? '-'} pts)` : '🏆 Start Daily Challenge'}
            </Button>
            {dailyStatus.played && (
              <Button 
                variant="outline" 
                w="100%" 
                size="md" 
                onClick={() => router.push('/game?mode=single&daily=1&leaderboard=1')}
              >
                📊 View Today’s Leaderboard
              </Button>
            )}
          </VStack>
        </Box>

        {/* Other Modes */}
        <Box p={6} borderWidth="1px" borderRadius="lg" boxShadow="md">
          <VStack spacing={4} align="stretch">
            <Heading as="h2" size="md">Practice</Heading>

            <Button 
              colorScheme="green" 
              size="lg" 
              w="100%" 
              onClick={startSingle} 
              fontWeight="bold" 
              fontSize="md" 
              py={6}
            >
              🎮 Start 60s Rush
            </Button>
            <Button 
              colorScheme="teal" 
              size="md" 
              w="100%" 
              onClick={startPvpLobby}
              variant="outline"
            >
              Play PvP
            </Button>
          </VStack>
        </Box>

        {/* PvP nickname modal (shown only when needed) */}
        <Modal isOpen={isOpen} onClose={onClose} isCentered>
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>Enter a nickname</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <FormControl>
                <Input
                  placeholder="Your nickname"
                  value={modalName}
                  onChange={(e) => setModalName(e.target.value)}
                  autoFocus
                />
                <FormHelperText fontSize="sm">This will be shown in PvP matches.</FormHelperText>
              </FormControl>
            </ModalBody>
            <ModalFooter>
              <Button variant="ghost" mr={3} onClick={() => { onClose(); }}>
                Cancel
              </Button>
              <Button colorScheme="teal" onClick={handleConfirmModal}>Continue</Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </VStack>
      </Container>
    </>
  );
}
