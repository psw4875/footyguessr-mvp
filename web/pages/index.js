import {
  Container,
  Box,
  Button,
  Input,
  Heading,
  Text,
  VStack,
  HStack,
  Badge,
  FormControl,
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
  const toast = useToast();

  const { isOpen, onOpen, onClose } = useDisclosure();
  const [modalName, setModalName] = useState("");
  const [pvpIntent, setPvpIntent] = useState("quick"); // quick | private

  const [dailyStatus, setDailyStatus] = useState({ played: false, score: null });

  useEffect(() => {
    try {
      // UTC date key for global consistency
      const dk = new Date().toISOString().slice(0, 10);
      const key = `fta_daily_${dk}`;
      const raw = localStorage.getItem(key);
      if (raw) setDailyStatus({ played: true, score: Number(raw) });
      else setDailyStatus({ played: false, score: null });
    } catch (e) {}
  }, []);

  function openPvp(intent) {
    setPvpIntent(intent);
    trackEvent(intent === "private" ? "click_pvp_private" : "click_pvp_quick");

    try {
      const stored = (localStorage.getItem("fta_nick") || "").trim();
      setModalName(stored);
    } catch (e) {
      setModalName("");
    }
    onOpen();
  }

  const startRush = () => {
    trackEvent("click_single_rush");
    router.push("/game?mode=single");
  };

  const startDaily = () => {
    trackEvent("click_daily_challenge");
    router.push("/game?mode=single&daily=1");
  };

  const viewDailyLeaderboard = () => {
    trackEvent("click_daily_leaderboard");
    router.push("/game?mode=single&daily=1&leaderboard=1");
  };

  function confirmPvp() {
    const v = String(modalName || "").trim();
    if (!v) {
      toast({
        title: "Nickname required",
        description: "Please enter a nickname to continue.",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    try {
      localStorage.setItem("fta_nick", v);
    } catch (e) {}

    onClose();
    router.push(
      `/game?mode=pvp&name=${encodeURIComponent(v)}&intent=${encodeURIComponent(pvpIntent)}`
    );
  }

  return (
    <>
      <MetaHead
        title="FootyGuessr: Guess Football Matches Quiz Game"
        description="Free online football quiz. Identify iconic matches from one photo. Play solo (60s Rush, Daily Challenge) or battle in 1v1 PvP."
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

          {/* SINGLE */}
          <Box
            p={6}
            borderWidth="2px"
            borderRadius="lg"
            boxShadow="md"
            borderColor="gray.200"
            bg="white"
          >
            <HStack justify="space-between" mb={2} align="center">
              <Heading as="h2" size="lg">
                🧍 Single
              </Heading>
              <Badge colorScheme="gray" variant="subtle">
                Solo play
              </Badge>
            </HStack>
            <Text fontSize="sm" color="gray.700" mb={4}>
              Play alone — beat your best or compete in today’s challenge.
            </Text>

            <VStack spacing={3} align="stretch">
              <Button
                colorScheme="teal"
                size="lg"
                w="100%"
                py={6}
                fontWeight="bold"
                onClick={startRush}
              >
                ⚡ Start 60s Rush
              </Button>

              <Box
                p={4}
                borderWidth="2px"
                borderRadius="md"
                bg={dailyStatus.played ? "gray.50" : "orange.50"}
                borderColor={dailyStatus.played ? "gray.300" : "orange.300"}
              >
                <HStack justify="space-between" mb={1}>
                  <Text fontWeight="bold">🔥 Daily Challenge</Text>
                  <Badge colorScheme="orange" variant="solid">
                    Once per day
                  </Badge>
                </HStack>
                <Text fontSize="sm" color="gray.700" mb={3}>
                  Same puzzle for everyone · Resets at 00:00 UTC.
                </Text>

                <Button
                  colorScheme={dailyStatus.played ? "gray" : "orange"}
                  size="lg"
                  w="100%"
                  py={6}
                  fontWeight="bold"
                  onClick={startDaily}
                >
                  {dailyStatus.played
                    ? `✓ Completed (${dailyStatus.score ?? "-"} pts)`
                    : "🏆 Start Daily Challenge"}
                </Button>

                <Button variant="outline" mt={3} w="100%" onClick={viewDailyLeaderboard}>
                  📊 View Today’s Leaderboard
                </Button>
              </Box>
            </VStack>
          </Box>

          {/* PVP */}
          <Box
            p={6}
            borderWidth="2px"
            borderRadius="lg"
            boxShadow="md"
            borderColor="gray.200"
            bg="white"
          >
            <HStack justify="space-between" mb={2} align="center">
              <Heading as="h2" size="lg">
                🧑‍🤝‍🧑 PvP
              </Heading>
              <Badge colorScheme="teal" variant="subtle">
                Real-time
              </Badge>
            </HStack>
            <Text fontSize="sm" color="gray.700" mb={4}>
              Play against others — quick match or invite a friend.
            </Text>

            <VStack spacing={3} align="stretch">
              <Button
                colorScheme="teal"
                size="lg"
                w="100%"
                py={6}
                fontWeight="bold"
                onClick={() => openPvp("quick")}
              >
                ⚡ Quick Match
              </Button>
              <Button
                variant="outline"
                size="lg"
                w="100%"
                py={6}
                onClick={() => openPvp("private")}
              >
                🔐 Private Game
              </Button>
              <Text fontSize="xs" color="gray.500">
                You’ll be asked for a nickname before entering PvP.
              </Text>
            </VStack>
          </Box>

          {/* PvP nickname modal */}
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
                  <FormHelperText fontSize="sm">
                    This will be shown in PvP matches.
                  </FormHelperText>
                </FormControl>
              </ModalBody>
              <ModalFooter>
                <Button variant="ghost" mr={3} onClick={onClose}>
                  Cancel
                </Button>
                <Button colorScheme="teal" onClick={confirmPvp}>
                  Continue to {pvpIntent === "private" ? "Private Game" : "Quick Match"}
                </Button>
              </ModalFooter>
            </ModalContent>
          </Modal>
        </VStack>
      </Container>
    </>
  );
}
